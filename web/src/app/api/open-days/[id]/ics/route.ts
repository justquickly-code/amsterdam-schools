export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function escapeIcsText(s: string) {
  return (s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// YYYYMMDDTHHMMSSZ (UTC)
function toUtcIcs(dtIso: string) {
  const d = new Date(dtIso);
  const yyyy = String(d.getUTCFullYear()).padStart(4, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const HH = String(d.getUTCHours()).padStart(2, "0");
  const MM = String(d.getUTCMinutes()).padStart(2, "0");
  const SS = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${HH}${MM}${SS}Z`;
}

function eventTypeLabel(t: string | null) {
  switch (t) {
    case "open_dag":
      return "Open dag";
    case "open_avond":
      return "Open avond";
    case "informatieavond":
      return "Info-avond";
    case "proefles":
      return "Proefles";
    default:
      return "Open dag";
  }
}

type OpenDayRow = {
  id: string;
  school_name: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location_text: string | null;
  info_url: string | null;
  event_type: string | null;
  school?: { name: string | null } | null;
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Missing Authorization" }, { status: 401 });
  }
  const jwt = authHeader.slice("Bearer ".length).trim();
  if (!jwt) {
    return NextResponse.json({ ok: false, error: "Missing Authorization" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { ok: false, error: "Missing env vars" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("open_days")
    .select(
      "id,school_name,starts_at,ends_at,location_text,info_url,event_type,school:schools(name)"
    )
    .eq("id", id)
    .maybeSingle<OpenDayRow>();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  if (!data.starts_at) {
    return NextResponse.json(
      { ok: false, error: "Event has no start time" },
      { status: 400 }
    );
  }

  const titleSchool = data.school?.name ?? data.school_name ?? "School";
  const type = eventTypeLabel(data.event_type ?? null);
  const summary = `${type} — ${titleSchool}`;

  const startUtc = toUtcIcs(data.starts_at);
  const endUtc = data.ends_at ? toUtcIcs(data.ends_at) : null;

  const location = escapeIcsText((data.location_text ?? "").toString());
  const url = (data.info_url ?? "").toString();

  const descriptionLines: string[] = [
    `Source: ${url || "n/a"}`,
    "",
    "Open day details can change. Always verify on the school website before you go.",
  ];

  const dtstamp = toUtcIcs(new Date().toISOString());
  const uid = `open-day-${data.id}@amsterdam-schools`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Amsterdam Schools//Open Days//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DTSTART:${startUtc}`,
    ...(endUtc ? [`DTEND:${endUtc}`] : []),
    ...(location ? [`LOCATION:${location}`] : []),
    ...(url ? [`URL:${escapeIcsText(url)}`] : []),
    `DESCRIPTION:${escapeIcsText(descriptionLines.join("\n"))}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  const filenameBase = summary
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${filenameBase || "open-day"}.ics"`,
      "cache-control": "no-store",
    },
  });
}
