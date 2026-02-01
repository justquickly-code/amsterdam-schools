#!/usr/bin/env python3
"""Export school IDs + names to CSV for DUO matching.

Requires env vars:
  - NEXT_PUBLIC_SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
"""

import csv
import json
import os
import urllib.parse
import urllib.request
import urllib.error


def http_request(url: str, headers: dict) -> list:
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            if not data:
                return []
            return json.loads(data.decode("utf-8"))
    except urllib.error.HTTPError as e:
        details = e.read().decode("utf-8")
        raise RuntimeError(f"HTTP {e.code} {e.reason} - {details}") from e


def main() -> None:
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key:
        raise SystemExit("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }

    params = urllib.parse.urlencode(
        {
            "select": "id,name,address,website_url",
            "limit": "1000",
            "order": "name.asc",
        }
    )
    url = f"{supabase_url}/rest/v1/schools?{params}"
    rows = http_request(url, headers)

    with open("scripts/schools_id_map.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["school_id", "name", "address", "website_url"])
        for r in rows:
            writer.writerow([
                r.get("id", ""),
                r.get("name", ""),
                r.get("address", ""),
                r.get("website_url", ""),
            ])

    print("Wrote scripts/schools_id_map.csv")


if __name__ == "__main__":
    main()
