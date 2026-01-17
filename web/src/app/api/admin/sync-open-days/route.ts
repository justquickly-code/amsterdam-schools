export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const OPEN_DAYS_URL = "https://schoolkeuze020.nl/open-dagen/";

function normalizeName(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\s+/g, " ")
    .replace(/[’'`"]/g, "")
    .replace(/[.,]/g, "")
    .trim();
}

function canonicalSchoolKey(raw: string) {
  let s = normalizeName(raw);

  // Remove parenthetical content (common: locations/abbreviations)
  s = s.replace(/\([^)]*\)/g, " ");

  // Remove trailing qualifiers after separators
  s = s.replace(/\s*[-–|].*$/g, " ");

  // Normalize whitespace again
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

function stripTrailingUrlLabel(s: string) {
  // Handles: "School Name (https://...)" which we generate via htmlToTextPreserveLinks()
  return (s ?? "").replace(/\s*\(https?:\/\/[^)]+\)\s*$/i, "").trim();
}

// MVP aliases for known mismatches between Schoolkeuze020 naming and Schoolwijzer naming.
// Add to this as you discover mismatches.
const NAME_ALIASES: Record<string, string> = {
  // Examples (adjust to your actual Schoolwijzer names):
  // "het cartesius": "cartesius lyceum",
  // "osb amsterdam": "osb",
  // "kairos college": "kairos tienercollege",
  // "orion college drostenburg": "orion college",
};

function tokens(s: string) {
  const stop = new Set([
    "de",
    "het",
    "een",
    "van",
    "voor",
    "op",
    "in",
    "en",
    "aan",
    "bij",
    "te",
    "st",
    "sint",
    // levels / common noise
    "vmbo",
    "havo",
    "vwo",
    "mavo",
    "praktijk",
    "college",
    "lyceum",
    "school",
  ]);

  return canonicalSchoolKey(s)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stop.has(t));
}

function tokenScore(a: string, b: string) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (A.size === 0 || B.size === 0) return 0;

  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;

  // Score relative to smaller set (helps when one name has extra words)
  return inter / Math.min(A.size, B.size);
}

const DUTCH_MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maart: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  augustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  december: 12,
};

function parseDateLine(line: string) {
  const m = (line ?? "")
    .trim()
    .match(
      /^(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+(\d{4})$/i
    );
  if (!m) return null;

  const day = Number(m[1]);
  const month = DUTCH_MONTHS[m[2].toLowerCase()];
  const year = Number(m[3]);
  if (!month) return null;

  return { year, month, day };
}

function parseTimeRange(line: string) {
  const s = (line ?? "")
    .toLowerCase()
    .replace(/uur/g, "")
    .replace(/\./g, ":")
    .replace(/–/g, "-")
    .replace(/tot/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const m = s.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!m) return null;
  return { start: m[1], end: m[2] };
}

function toAmsterdamISO(date: { year: number; month: number; day: number }, hhmm: string) {
  // MVP assumption: most open days are Jan/Feb => +01:00 is usually fine.
  const [hh, mm] = hhmm.split(":").map(Number);
  const yyyy = String(date.year).padStart(4, "0");
  const MM = String(date.month).padStart(2, "0");
  const dd = String(date.day).padStart(2, "0");
  const HH = String(hh).padStart(2, "0");
  const mM = String(mm).padStart(2, "0");
  return `${yyyy}-${MM}-${dd}T${HH}:${mM}:00+01:00`;
}

function extractFirstUrl(text: string) {
  const m = (text ?? "").match(/https?:\/\/[^\s)"']+/i);
  return m?.[0] ?? null;
}

function extractFirstUrlNear(html: string, idx: number) {
  const slice = html.slice(Math.max(0, idx - 300), idx + 1200);
  return extractFirstUrl(slice);
}

function hostOf(u: string | null) {
  if (!u) return null;
  try {
    const h = new URL(u).hostname.toLowerCase();
    return h.startsWith("www.") ? h.slice(4) : h;
  } catch {
    return null;
  }
}

function htmlToTextPreserveLinks(html: string) {
  // Convert <a href="...">Text</a> -> "Text (URL)" BEFORE stripping tags
  const withLinks = html.replace(
    /<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi,
    (_m, _q, href, inner) => {
      const label = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      const url = String(href || "").trim();
      if (!url) return label;
      return `${label} (${url})`;
    }
  );

  return withLinks
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")

    // Preserve headings as "### "
    .replace(/<h[1-6][^>]*>/gi, "\n### ")
    .replace(/<\/h[1-6]>/gi, "\n")

    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")

    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function classifyEventType(desc: string | null) {
  const d = (desc ?? "").toLowerCase();
  if (d.includes("lesjes") || d.includes("proef") || d.includes("meeloop")) return "proefles";
  if (d.includes("informatie") || d.includes("voorlichting")) return "informatieavond";
  if (d.includes("open avond")) return "open_avond";
  if (d.includes("open dag") || d.includes("open middag")) return "open_dag";
  return "other";
}

type ParsedOpenDay = {
  source: "schoolkeuze020";
  source_id: string;
  school_name: string;
  school_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location_text: string | null;
  info_url: string | null;
  notes: string | null;
  school_year_label: string;
  last_synced_at: string;
  event_type: string;
  last_seen_at: string;
  is_active: boolean;
  missing_since?: string | null;
};

type SchoolRow = {
  id: string;
  name: string | null;
  website_url: string | null;
};

export async function POST(req: Request) {
  try {
    // Optional admin token gate (recommended if you deploy this)
    const token = process.env.ADMIN_SYNC_TOKEN;
    if (token) {
      const got = req.headers.get("x-admin-token");
      if (got !== token) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = (await req.json().catch(() => ({}))) as { school_year_label?: string };
    const schoolYear = body.school_year_label ?? "2025/26";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json(
        { ok: false, error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    // Fetch schools for matching
    const { data: schools, error: schErr } = await admin.from("schools").select("id,name,website_url");
    if (schErr) return NextResponse.json({ ok: false, error: schErr.message }, { status: 500 });

    // Build matching indexes
    const exactNameMap = new Map<string, string>(); // canonical -> id
    const allSchools: Array<{ id: string; name: string; key: string }> = [];
    const domainMap = new Map<string, string>(); // host -> id

    for (const s of (schools ?? []) as SchoolRow[]) {
      const id = s.id as string;
      const name = String(s.name ?? "");
      const key = canonicalSchoolKey(name);
      if (key) exactNameMap.set(key, id);
      allSchools.push({ id, name, key });

      const h = hostOf(s.website_url ?? null);
      if (h) domainMap.set(h, id);
    }

    // Fetch open days HTML
    const res = await fetch(OPEN_DAYS_URL, {
      headers: {
        "user-agent": "amsterdam-schools/1.0 (+local dev)",
        accept: "text/html",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Failed to fetch open days (${res.status})` },
        { status: 500 }
      );
    }

    const html = await res.text();
    const text = htmlToTextPreserveLinks(html);

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const nowIso = new Date().toISOString();
    const parsed: ParsedOpenDay[] = [];
    let currentDate: { year: number; month: number; day: number } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const dateParsed = parseDateLine(line);
      if (dateParsed) {
        currentDate = dateParsed;
        continue;
      }

      if (!currentDate) continue;
      if (!line.startsWith("###")) continue;

      // Headings sometimes become just "###" after stripping HTML.
      // In that case, the title is usually on the next line.
      let schoolName = line.replace(/^###\s*/, "").trim();

      if (!schoolName) {
        const nextLine = lines[i + 1] ?? "";
        const nextNextLine = lines[i + 2] ?? "";
        schoolName = nextLine && !nextLine.startsWith("###") ? nextLine.trim() : "";
        if (!schoolName && nextNextLine && !nextNextLine.startsWith("###")) {
          schoolName = nextNextLine.trim();
        }
      }
      if (!schoolName) continue;

      const schoolNameClean = stripTrailingUrlLabel(schoolName);





      // collect the next lines until next heading/date (max 12 lines)
      const block: string[] = [];
      for (let j = i + 1; j < Math.min(i + 13, lines.length); j++) {
        const t = lines[j];
        if (parseDateLine(t)) break;
        if (t.startsWith("###")) break;

        const tl = t.toLowerCase();
        if (tl.includes("deze school van mijn lijst verwijderen")) continue;
        if (tl === "filteren" || tl.includes("toon filters") || tl.includes("verberg filters")) continue;

        block.push(t.replace(/^•\s*/, "").trim());
      }

      // time
      const timeLine = block.find((t) => parseTimeRange(t));
      const timeRange = timeLine ? parseTimeRange(timeLine) : null;
      if (!timeRange) continue;

      const startsAt = toAmsterdamISO(currentDate, timeRange.start);
      const endsAt = toAmsterdamISO(currentDate, timeRange.end);

      // location + desc
      const locationText =
        block.find((t) => t !== timeLine && /\(.+\)/.test(t)) ??
        block.find((t) => t !== timeLine) ??
        null;

      const desc =
        block.find(
          (t) =>
            t !== timeLine &&
            /open|lesjes|proef|meeloop|informatie|voorlichting|rondleiding|inloop/i.test(t)
        ) ?? null;

      const eventType = classifyEventType(desc);

      // url extraction: from block; otherwise near the school name in raw HTML
      const blockText = block.join(" ");
      let infoUrl = extractFirstUrl(blockText);

      if (!infoUrl) {
        const idx = html.toLowerCase().indexOf(schoolNameClean.toLowerCase());
        if (idx >= 0) infoUrl = extractFirstUrlNear(html, idx);
      }

      // --- match school_id ---
      let key = canonicalSchoolKey(schoolNameClean);
      if (NAME_ALIASES[key]) key = NAME_ALIASES[key];

      let matchedSchoolId: string | null = null;

      // 1) domain match
      const h = hostOf(infoUrl);
      if (h) matchedSchoolId = domainMap.get(h) ?? null;

      // 2) exact canonical match
      if (!matchedSchoolId) matchedSchoolId = exactNameMap.get(key) ?? null;

      // 3) token fuzzy match (best overlap)
      if (!matchedSchoolId && key) {
        let best: { id: string; score: number } | null = null;

        for (const s of allSchools) {
          const score = tokenScore(key, s.key);
          if (!best || score > best.score) best = { id: s.id, score };
        }

        // threshold: tune if you want more aggressive matches
        if (best && best.score >= 0.7) matchedSchoolId = best.id;
      }

      const y = currentDate.year;
      const m = String(currentDate.month).padStart(2, "0");
      const d = String(currentDate.day).padStart(2, "0");

      const sourceId =
        `${y}-${m}-${d}` +
        `|${key}` +
        `|${timeRange.start}-${timeRange.end}` +
        `|${eventType}`;

      parsed.push({
        source: "schoolkeuze020",
        source_id: sourceId,
        school_name: schoolNameClean,
        school_id: matchedSchoolId,
        starts_at: startsAt,
        ends_at: endsAt,
        location_text: locationText,
        info_url: infoUrl,
        notes: desc,
        event_type: eventType,
        school_year_label: schoolYear,
        last_synced_at: nowIso,
        last_seen_at: nowIso,
        is_active: true,
      });
    }

    // Deduplicate within this run
    const unique: ParsedOpenDay[] = Array.from(
      new Map(parsed.map((p) => [`${p.source}|${p.source_id}`, p])).values()
    );

    const { error: upErr } = await admin.from("open_days").upsert(unique, {
      onConflict: "source,source_id",
    });

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    const { count: deactivatedCount, error: deactErr } = await admin
      .from("open_days")
      .update({ is_active: false, missing_since: nowIso })
      .eq("school_year_label", schoolYear)
      .eq("is_active", true)
      .lt("last_seen_at", nowIso)
      .select("id", { count: "exact" });

    if (deactErr) {
      return NextResponse.json({ ok: false, error: deactErr.message }, { status: 500 });
    }

    const { count: reactivatedCount, error: reactErr } = await admin
      .from("open_days")
      .update({ is_active: true, missing_since: null })
      .eq("school_year_label", schoolYear)
      .eq("last_seen_at", nowIso)
      .not("missing_since", "is", null)
      .select("id", { count: "exact" });

    if (reactErr) {
      return NextResponse.json({ ok: false, error: reactErr.message }, { status: 500 });
    }

    const sampleMatched = unique.filter((p) => p.school_id).slice(0, 10).map((p) => p.school_name);
    const sampleUnmatched = unique.filter((p) => !p.school_id).slice(0, 10).map((p) => p.school_name);

    return NextResponse.json({
      ok: true,
      source: OPEN_DAYS_URL,
      school_year_label: schoolYear,
      parsed: unique.length,
      matched_school_ids: unique.filter((p) => p.school_id).length,
      deactivated_count: deactivatedCount ?? 0,
      reactivated_count: reactivatedCount ?? 0,
      sample_matched: sampleMatched,
      sample_unmatched: sampleUnmatched,
      note: "Always verify on the school website (source can change).",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}