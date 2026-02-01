#!/usr/bin/env python3
"""Import DUO seed data into Supabase (schools + school_metrics).

Requires env vars:
  - NEXT_PUBLIC_SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY

Usage:
  python3 scripts/import_duo_school_data.py /path/to/amsterdam_vo_schools_seed.xlsx

Optional env vars:
  - DUO_IMPORT_DRY_RUN=1 (no writes)
  - DUO_MATCH_NAME_ONLY=1 (allow name-only matches when unique)
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

ERROR_VALUE = "Error: #VALUE!"


def die(msg: str) -> None:
    print(msg, file=sys.stderr)
    sys.exit(1)


def read_shared_strings(z: zipfile.ZipFile) -> Optional[List[str]]:
    try:
        sst = ET.fromstring(z.read("xl/sharedStrings.xml"))
    except KeyError:
        return None
    strings: List[str] = []
    for si in sst.findall("main:si", NS):
        texts = [t.text or "" for t in si.findall(".//main:t", NS)]
        strings.append("".join(texts))
    return strings


def cell_value(c: ET.Element, shared_strings: Optional[List[str]]) -> Optional[str]:
    t = c.attrib.get("t")
    if t == "inlineStr":
        is_elem = c.find("main:is", NS)
        if is_elem is None:
            return None
        texts = [t.text or "" for t in is_elem.findall(".//main:t", NS)]
        return "".join(texts)
    v = c.find("main:v", NS)
    if v is None:
        return None
    value = v.text
    if value is None:
        return None
    if t == "s" and shared_strings is not None:
        try:
            return shared_strings[int(value)]
        except Exception:
            return value
    return value


def col_key(c: str) -> int:
    n = 0
    for ch in c:
        n = n * 26 + (ord(ch) - ord("A") + 1)
    return n


def load_sheet(path: str, sheet_name: str) -> Tuple[List[str], List[List[Optional[str]]]]:
    with zipfile.ZipFile(path) as z:
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rel_map = {r.attrib["Id"]: r.attrib["Target"] for r in rels.findall("pkgrel:Relationship", NS)}

        sheet_target = None
        for s in wb.findall("main:sheets/main:sheet", NS):
            if s.attrib["name"] == sheet_name:
                rel_id = s.attrib.get(f"{{{NS['rel']}}}id")
                sheet_target = rel_map.get(rel_id)
                break
        if not sheet_target:
            die(f"Sheet not found: {sheet_name}")

        shared_strings = read_shared_strings(z)
        sheet_path = sheet_target.lstrip("/")
        root = ET.fromstring(z.read(sheet_path))
        rows = root.findall("main:sheetData/main:row", NS)
        if not rows:
            return [], []

        header_row = rows[0]
        cells = header_row.findall("main:c", NS)
        cols: List[str] = []
        header_map: Dict[str, Optional[str]] = {}
        for c in cells:
            ref = c.attrib.get("r", "")
            col = "".join(ch for ch in ref if ch.isalpha())
            cols.append(col)
            header_map[col] = cell_value(c, shared_strings)
        cols.sort(key=col_key)
        headers = [header_map.get(c) or "" for c in cols]

        data_rows: List[List[Optional[str]]] = []
        for r in rows[1:]:
            row_map: Dict[str, Optional[str]] = {}
            for c in r.findall("main:c", NS):
                ref = c.attrib.get("r", "")
                col = "".join(ch for ch in ref if ch.isalpha())
                row_map[col] = cell_value(c, shared_strings)
            data_rows.append([row_map.get(c) for c in cols])
        return headers, data_rows


def norm_text(value: Optional[str]) -> str:
    if not value:
        return ""
    s = value.lower().strip()
    s = s.replace("&", " en ")
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def norm_postcode(value: Optional[str]) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", "", value).upper()


def parse_house_nr(value: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    if not value:
        return None, None
    raw = value.strip()
    m = re.match(r"^(\d+)(.*)$", raw)
    if not m:
        return raw, None
    num = m.group(1)
    suffix = m.group(2).strip() or None
    return num, suffix

def parse_address_components(address: Optional[str]) -> Tuple[str, Optional[str]]:
    if not address:
        return "", None
    raw = address.strip()
    # Dutch postcode pattern: 1234AB (with optional space)
    m = re.search(r"(\d{4})\s*([A-Za-z]{2})", raw)
    postcode = ""
    if m:
        postcode = f"{m.group(1)}{m.group(2)}".upper()
    # House number: digits possibly followed by letters or suffix
    n = re.search(r"\b(\d{1,5})\s*([A-Za-z]{0,3})\b", raw)
    if not n:
        return postcode, None
    nr = n.group(1)
    suffix = n.group(2) or ""
    return postcode, f"{nr}{suffix}".strip()


def to_bool(value: Optional[str]) -> Optional[bool]:
    if value is None:
        return None
    if value == ERROR_VALUE:
        return None
    if str(value).strip() == "1":
        return True
    if str(value).strip() == "0":
        return False
    return None


def to_float(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    if value == ERROR_VALUE:
        return None
    try:
        return float(value)
    except Exception:
        return None


def read_match_file(path: str) -> Dict[str, Dict[str, str]]:
    matches: Dict[str, Dict[str, str]] = {}
    with open(path, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f.readlines() if line.strip()]
    if not lines:
        return matches
    header = [h.strip() for h in lines[0].split(",")]
    if "duo_school_id" not in header:
        die("Match file must include duo_school_id column.")
    for line in lines[1:]:
        parts = [p.strip() for p in line.split(",")]
        row = {header[i]: parts[i] if i < len(parts) else "" for i in range(len(header))}
        duo_id = row.get("duo_school_id") or ""
        if duo_id:
            matches[duo_id] = row
    return matches


def write_unmatched(path: str, rows: List[Dict[str, str]]) -> None:
    if not rows:
        return
    header = [
        "duo_school_id",
        "vestigingsnaam",
        "postcode",
        "straat",
        "huisnr",
        "huisnr_suffix",
    ]
    with open(path, "w", encoding="utf-8") as f:
        f.write(",".join(header) + "\n")
        for r in rows:
            values = [
                r.get("duo_school_id", ""),
                r.get("name", ""),
                r.get("postcode", ""),
                r.get("street", ""),
                r.get("house_nr", ""),
                r.get("house_nr_suffix", ""),
            ]
            safe = [v if isinstance(v, str) else "" for v in values]
            f.write(",".join(safe) + "\n")


def http_request(method: str, url: str, headers: Dict[str, str], body: Optional[bytes] = None) -> Any:
    req = urllib.request.Request(url, method=method, headers=headers, data=body)
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            if not data:
                return None
            return json.loads(data.decode("utf-8"))
    except urllib.error.HTTPError as e:
        details = e.read().decode("utf-8")
        raise RuntimeError(f"HTTP {e.code} {e.reason} - {details}")


def main() -> None:
    if len(sys.argv) < 2:
        die("Usage: python3 scripts/import_duo_school_data.py /path/to/amsterdam_vo_schools_seed.xlsx")

    xlsx_path = sys.argv[1]
    if not os.path.exists(xlsx_path):
        die(f"File not found: {xlsx_path}")

    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key:
        die("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    dry_run = os.getenv("DUO_IMPORT_DRY_RUN") == "1"
    allow_name_only = os.getenv("DUO_MATCH_NAME_ONLY") == "1"
    match_file_path = os.getenv("DUO_MATCH_FILE")
    unmatched_output = os.getenv("DUO_UNMATCHED_OUTPUT") or "scripts/duo_unmatched.csv"

    headers, rows = load_sheet(xlsx_path, "Schools_AMS_main")
    idx = {h: i for i, h in enumerate(headers)}

    required = [
        "school_id",
        "brin",
        "vestiging_nr",
        "vestigingsnaam",
        "postcode",
        "straat",
        "huisnr_toev",
        "denominatie",
        "telefoon",
        "website",
        "include_in_main_db",
        "public_use_ok",
    ]
    for col in required:
        if col not in idx:
            die(f"Missing column in Schools_AMS_main: {col}")

    duo_rows = []
    for r in rows:
        include_flag = (r[idx["include_in_main_db"]] or "").strip()
        public_ok = (r[idx["public_use_ok"]] or "")
        if include_flag != "1":
            continue
        if "YES" not in public_ok:
            continue
        duo_id = r[idx["school_id"]]
        if not duo_id:
            continue
        house_raw = r[idx["huisnr_toev"]]
        house_nr, house_suffix = parse_house_nr(house_raw)
        duo_rows.append(
            {
                "duo_school_id": duo_id,
                "brin": r[idx["brin"]],
                "vestiging_nr": r[idx["vestiging_nr"]],
                "name": r[idx["vestigingsnaam"]],
                "postcode": norm_postcode(r[idx["postcode"]]),
                "street": r[idx["straat"]],
                "house_nr": house_nr,
                "house_nr_suffix": house_suffix,
                "denominatie": r[idx["denominatie"]],
                "phone": r[idx["telefoon"]],
                "website": r[idx["website"]],
                "public_use_ok": public_ok,
            }
        )

    metrics_headers, metrics_rows = load_sheet(xlsx_path, "Metrics_long")
    midx = {h: i for i, h in enumerate(metrics_headers)}
    required_metrics = [
        "school_id",
        "metric_period",
        "metric_group",
        "metric_name",
        "value",
        "unit",
        "notes",
        "public_use_ok",
        "source",
    ]
    for col in required_metrics:
        if col not in midx:
            die(f"Missing column in Metrics_long: {col}")

    metrics_rows_filtered = []
    for r in metrics_rows:
        public_ok = r[midx["public_use_ok"]] or ""
        if "YES" not in public_ok:
            continue
        metrics_rows_filtered.append(r)

    headers_common = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }

    schools_url = f"{supabase_url}/rest/v1/schools"
    select_params = urllib.parse.urlencode(
        {
            "select": "id,name,address,website_url,duo_school_id,postcode,street,house_nr,house_nr_suffix",
            "limit": "1000",
        }
    )
    existing = http_request("GET", f"{schools_url}?{select_params}", headers_common) or []

    existing_by_duo = {}
    existing_by_name_postcode = defaultdict(list)
    existing_by_postcode_house = defaultdict(list)
    existing_by_name = defaultdict(list)

    for s in existing:
        name_key = norm_text(s.get("name"))
        postcode_key = norm_postcode(s.get("postcode"))
        address_postcode, address_house = parse_address_components(s.get("address"))
        address_house_norm = address_house or ""
        if s.get("duo_school_id"):
            existing_by_duo[s["duo_school_id"]] = s
        if name_key and postcode_key:
            existing_by_name_postcode[(name_key, postcode_key)].append(s)
        if name_key:
            existing_by_name[name_key].append(s)
        if address_postcode and address_house_norm:
            existing_by_postcode_house[(address_postcode, address_house_norm)].append(s)

    manual_matches = read_match_file(match_file_path) if match_file_path else {}

    matched = 0
    name_only_matches = 0
    manual_match_count = 0
    ambiguous = 0
    unmatched = 0

    updates = []
    duo_to_school_id = {}
    unmatched_rows: List[Dict[str, str]] = []

    for d in duo_rows:
        duo_id = d["duo_school_id"]
        name_key = norm_text(d["name"])
        postcode_key = d["postcode"]

        manual = manual_matches.get(duo_id)
        if manual:
            school_id_override = manual.get("school_id") or ""
            if school_id_override:
                target = next((s for s in existing if s.get("id") == school_id_override), None)
            else:
                target = None
                manual_name = norm_text(manual.get("school_name") or "")
                if manual_name:
                    candidates = existing_by_name.get(manual_name, [])
                    if len(candidates) == 1:
                        target = candidates[0]
            if target:
                manual_match_count += 1
        else:
            target = existing_by_duo.get(duo_id)
        if not target and postcode_key and d.get("house_nr"):
            duo_house = d.get("house_nr") or ""
            duo_suffix = d.get("house_nr_suffix") or ""
            duo_house_norm = f"{duo_house}{duo_suffix}".strip()
            candidates = existing_by_postcode_house.get((postcode_key, duo_house_norm), [])
            if len(candidates) == 1:
                target = candidates[0]
            elif len(candidates) > 1:
                ambiguous += 1
                continue
        if not target and name_key and postcode_key:
            candidates = existing_by_name_postcode.get((name_key, postcode_key), [])
            if len(candidates) == 1:
                target = candidates[0]
            elif len(candidates) > 1:
                ambiguous += 1
                continue
        if not target and allow_name_only and name_key:
            candidates = existing_by_name.get(name_key, [])
            if len(candidates) == 1:
                target = candidates[0]
                name_only_matches += 1
            elif len(candidates) > 1:
                ambiguous += 1
                continue

        if not target:
            unmatched += 1
            unmatched_rows.append(d)
            continue

        matched += 1
        duo_to_school_id[duo_id] = target["id"]

        payload: Dict[str, Any] = {}
        if not target.get("duo_school_id"):
            payload["duo_school_id"] = duo_id
        if not target.get("postcode") and d.get("postcode"):
            payload["postcode"] = d["postcode"]
        if not target.get("street") and d.get("street"):
            payload["street"] = d["street"]
        if not target.get("house_nr") and d.get("house_nr"):
            payload["house_nr"] = d["house_nr"]
        if not target.get("house_nr_suffix") and d.get("house_nr_suffix"):
            payload["house_nr_suffix"] = d["house_nr_suffix"]
        if d.get("brin"):
            payload["brin"] = d["brin"]
        if d.get("vestiging_nr"):
            payload["vestiging_nr"] = d["vestiging_nr"]
        if d.get("denominatie"):
            payload["denominatie"] = d["denominatie"]
        if d.get("phone"):
            payload["phone"] = d["phone"]
        if d.get("website") and not target.get("website_url"):
            website = d["website"].strip()
            if website and not website.startswith("http"):
                website = f"https://{website}"
            payload["website_url"] = website

        if payload:
            updates.append((target["id"], payload))

    print(f"Schools in seed: {len(duo_rows)}")
    print(f"Matched: {matched} (manual: {manual_match_count}, name-only: {name_only_matches})")
    print(f"Ambiguous: {ambiguous}")
    print(f"Unmatched: {unmatched}")
    print(f"Schools to update: {len(updates)}")

    if unmatched_rows:
        write_unmatched(unmatched_output, unmatched_rows)
        print(f"Unmatched list written: {unmatched_output}")

    if dry_run:
        print("Dry run enabled. Skipping writes.")
        return

    for school_id, payload in updates:
        params = urllib.parse.urlencode({"id": f"eq.{school_id}"})
        http_request(
            "PATCH",
            f"{schools_url}?{params}",
            {**headers_common, "Prefer": "return=minimal"},
            body=json.dumps(payload).encode("utf-8"),
        )

    # Build metrics for matched schools only
    metrics_payload = []
    for r in metrics_rows_filtered:
        duo_id = r[midx["school_id"]]
        school_id = duo_to_school_id.get(duo_id)
        if not school_id:
            continue
        value_raw = r[midx["value"]]
        value_numeric = to_float(value_raw)
        value_text = None if value_numeric is not None else (value_raw if value_raw != ERROR_VALUE else None)
        metrics_payload.append(
            {
                "school_id": school_id,
                "duo_school_id": duo_id,
                "metric_group": r[midx["metric_group"]],
                "metric_name": r[midx["metric_name"]],
                "period": r[midx["metric_period"]],
                "value_numeric": value_numeric,
                "value_text": value_text,
                "unit": r[midx["unit"]],
                "notes": r[midx["notes"]],
                "source": r[midx["source"]],
                "public_use_ok": r[midx["public_use_ok"]],
            }
        )

    print(f"Metrics rows to insert: {len(metrics_payload)}")

    # Remove existing metrics for matched schools to avoid duplicates
    school_ids = list({m["school_id"] for m in metrics_payload})
    if school_ids:
        delete_filter = ",".join(school_ids)
        delete_url = f"{supabase_url}/rest/v1/school_metrics?school_id=in.({delete_filter})"
        http_request("DELETE", delete_url, headers_common)

    batch_size = 200
    metrics_url = f"{supabase_url}/rest/v1/school_metrics"
    for i in range(0, len(metrics_payload), batch_size):
        batch = metrics_payload[i : i + batch_size]
        http_request(
            "POST",
            metrics_url,
            {**headers_common, "Prefer": "return=minimal"},
            body=json.dumps(batch).encode("utf-8"),
        )
        time.sleep(0.1)


if __name__ == "__main__":
    main()
