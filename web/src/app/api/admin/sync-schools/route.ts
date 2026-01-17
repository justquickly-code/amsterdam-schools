import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type JsonApiResponse = {
  data: Array<{
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  }>;
  links?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

function normalizeLevelToken(raw: string): string | null {
  const s = raw.toLowerCase();

  // Common tokens we want to normalize into a stable internal set
  if (s.includes("vwo") || s.includes("gymnasium")) return "vwo";
  if (s.includes("havo")) return "havo";

  // vmbo variants
  if (s.includes("vmbo-theoretisch") || s.includes("vmbo tl") || s.includes("mavo"))
    return "vmbo-tl";
  if (s.includes("vmbo-gemengde")) return "vmbo-gl";
  if (s.includes("vmbo-kader")) return "vmbo-kb";
  if (s.includes("vmbo-basis")) return "vmbo-bb";

  if (s.includes("praktijkonderwijs")) return "praktijkonderwijs";
  if (s.includes("pro")) return "praktijkonderwijs";

  // If it's already one of our canonical forms
  const canonical = new Set([
    "vwo",
    "havo",
    "vmbo-tl",
    "vmbo-gl",
    "vmbo-kb",
    "vmbo-bb",
    "praktijkonderwijs",
  ]);
  if (canonical.has(s)) return s;

  return null;
}

function extractSupportedLevels(attrs: Record<string, unknown>): string[] {
  // We don't know the exact attribute name in advance, so we scan common-looking fields.
  const candidates: unknown[] = [];

  const keysToTry = [
    "schooltypen",
    "schooltypen_naam",
    "onderwijssoorten",
    "onderwijssoorten_naam",
    "onderwijsaanbod",
    "aanbod",
    "profielen",
    "leerwegen",
  ];

  for (const k of keysToTry) {
    if (attrs[k] != null) candidates.push(attrs[k]);
  }

  // Also scan for any array fields containing relevant strings
  for (const v of Object.values(attrs)) {
    if (Array.isArray(v)) candidates.push(v);
    if (typeof v === "string" && /vwo|havo|vmbo|mavo|gymnasium|praktijk/i.test(v)) {
      candidates.push([v]);
    }
  }

  const tokens: string[] = [];

  for (const c of candidates) {
    if (!c) continue;

    if (Array.isArray(c)) {
      const list = c as unknown[];
      for (const item of list) {
        if (typeof item === "string") tokens.push(item);
        else if (item && typeof item === "object") {
          // JSON:API attribute arrays sometimes contain objects
          const itemObj = item as Record<string, unknown>;
          for (const val of Object.values(itemObj)) {
            if (typeof val === "string") tokens.push(val);
          }
        }
      }
    } else if (typeof c === "string") {
      tokens.push(c);
    } else if (c && typeof c === "object") {
      const obj = c as Record<string, unknown>;
      for (const val of Object.values(obj)) {
        if (typeof val === "string") tokens.push(val);
        if (Array.isArray(val)) {
          const items = val as unknown[];
          for (const item of items) if (typeof item === "string") tokens.push(item);
        }
      }
    }
  }

  const normalized = new Set<string>();
  for (const t of tokens) {
    const n = normalizeLevelToken(t);
    if (n) normalized.add(n);
  }

  return Array.from(normalized).sort();
}

function extractName(attrs: Record<string, unknown>): string {
  const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const candidates = [attrs["naam"], attrs["name"], attrs["titel"], attrs["title"]];
  for (const v of candidates) {
    const s = asString(v);
    if (s) return s;
  }
  return "";
}

function extractWebsite(attrs: Record<string, unknown>): string | null {
  const v =
    attrs["website_url"] ??
    attrs["website"] ??
    attrs["url"] ??
    attrs["schoolwebsite"] ??
    attrs["websiteadres"] ??
    null;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function extractLatLng(attrs: Record<string, unknown>): { lat: number | null; lng: number | null } {
  const locatie = attrs["locatie"];
  const locatieObj = locatie && typeof locatie === "object" ? (locatie as Record<string, unknown>) : null;

  const lat =
    attrs["lat"] ??
    attrs["latitude"] ??
    attrs["geo_lat"] ??
    attrs["coord_lat"] ??
    attrs["y"] ??
    (locatieObj?.["lat"] ?? null);

  const lng =
    attrs["lng"] ??
    attrs["lon"] ??
    attrs["longitude"] ??
    attrs["geo_lng"] ??
    attrs["coord_lng"] ??
    attrs["x"] ??
    (locatieObj?.["lng"] ?? locatieObj?.["lon"] ?? null);

  const latNum = typeof lat === "number" ? lat : lat != null ? Number(lat) : null;
  const lngNum = typeof lng === "number" ? lng : lng != null ? Number(lng) : null;

  return {
    lat: latNum != null && Number.isFinite(latNum) ? latNum : null,
    lng: lngNum != null && Number.isFinite(lngNum) ? lngNum : null,
  };
}

function extractAddress(attrs: Record<string, unknown>): string | null {
  // Try a few common patterns
  const straat = attrs["straat"] ?? attrs["straatnaam"] ?? attrs["street"] ?? attrs["adres_straat"] ?? null;
  const huisnr = attrs["huisnummer"] ?? attrs["house_number"] ?? attrs["adres_huisnummer"] ?? null;
  const postcode = attrs["postcode"] ?? attrs["zip"] ?? attrs["adres_postcode"] ?? null;
  const plaats = attrs["plaats"] ?? attrs["woonplaats"] ?? attrs["city"] ?? "Amsterdam";

  // Sometimes there's a single address field
  const single =
    attrs["adres"] ??
    attrs["address"] ??
    attrs["volledig_adres"] ??
    attrs["volledigadres"] ??
    null;

  if (typeof single === "string" && single.trim()) return single.trim();

  const parts = [
    straat ? String(straat).trim() : "",
    huisnr != null ? String(huisnr).trim() : "",
    postcode ? String(postcode).trim() : "",
    plaats ? String(plaats).trim() : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" ") : null;
}

export async function POST(req: Request) {
  const adminToken = req.headers.get("x-admin-token") ?? "";
  if (!process.env.ADMIN_SYNC_TOKEN || adminToken !== process.env.ADMIN_SYNC_TOKEN) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { schoolYearLabel } = (await req.json().catch(() => ({}))) as {
    schoolYearLabel?: string;
  };

  const label = (schoolYearLabel ?? "").trim();
  if (!label) {
    return NextResponse.json({ ok: false, error: "schoolYearLabel is required" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY in env" },
      { status: 500 }
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const base = "https://schoolwijzer.amsterdam.nl/api/v2/vestigingen";
  const filter = "filter[soort_onderwijs][]=voortgezet-onderwijs";

  let page = 1;
  let totalFetched = 0;
  let totalUpserted = 0;

  while (true) {
    const endpoint = `${base}?${filter}&page[number]=${page}`;
    const res = await fetch(endpoint, {
      headers: {
        // JSON:API compatible
        Accept: "application/vnd.api+json, application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `Fetch failed: ${res.status}`, details: text.slice(0, 500) },
        { status: 500 }
      );
    }

    const json = (await res.json()) as JsonApiResponse;
    const data = Array.isArray(json.data) ? json.data : [];
    if (data.length === 0) break;

    totalFetched += data.length;

    const rows = data.map((item) => {
      const attrs = item.attributes ?? {};
      const { lat, lng } = extractLatLng(attrs);

      return {
        source: "schoolwijzer",
        source_id: item.id,
        name: extractName(attrs),
        address: extractAddress(attrs),
        website_url: extractWebsite(attrs),
        supported_levels: extractSupportedLevels(attrs),
        lat,
        lng,
        last_synced_at: new Date().toISOString(),
      };
    });

    const { error } = await admin.from("schools").upsert(rows, {
      onConflict: "source,source_id",
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    totalUpserted += rows.length;

    // JSON:API responses are limited to 75; continue until empty page
    page += 1;

    // Safety cap so we don't loop forever if the API behaves unexpectedly
    if (page > 50) break;
  }

  // Record sync run
  const { error: runErr } = await admin.from("data_sync_runs").insert({
    source: "schoolwijzer_schools",
    school_year_label: label,
    status: "success",
    notes: `Fetched ${totalFetched}, upserted ${totalUpserted}`,
  });

  if (runErr) {
    return NextResponse.json(
      { ok: true, warning: "Synced but could not write data_sync_runs", details: runErr.message },
      { status: 200 }
    );
  }

  return NextResponse.json({
    ok: true,
    schoolYearLabel: label,
    pages: page - 1,
    fetched: totalFetched,
    upserted: totalUpserted,
  });
}