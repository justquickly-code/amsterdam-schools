"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type OpenDay = {
  id: string;
  school_id: string | null;
  school_name: string;
  starts_at: string | null;
  ends_at: string | null;
  location_text: string | null;
  info_url: string | null;
  school_year_label: string;
  last_synced_at: string;
  event_type: string | null;
  school?: { id: string; name: string } | null;
};

type Commute = {
  duration_minutes: number;
  distance_km: number;
};

function stripTrailingUrlLabel(s: string) {
  return (s ?? "").replace(/\s*\(https?:\/\/[^)]+\)\s*$/i, "").trim();
}

function stripAnyUrlLabel(s: string | null) {
  if (!s) return null;
  return s.replace(/\s*\(https?:\/\/[^)]+\)\s*/gi, " ").replace(/\s+/g, " ").trim();
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("nl-NL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function eventTypeLabel(t: string | null) {
  switch (t) {
    case "open_dag":
      return "Open dag";
    case "open_avond":
      return "Open avond";
    case "informatieavond":
      return "Info";
    case "proefles":
      return "Proefles";
    case "other":
      return "Other";
    default:
      return null;
  }
}

function normalizeType(t: string | null) {
  return (t ?? "other").toLowerCase();
}

type DateRangeFilter = "all" | "7" | "14";

function pillClass() {
  return "text-xs rounded-full border px-2 py-0.5 text-muted-foreground";
}

function actionClass() {
  return "text-xs rounded-md border px-2 py-1 hover:bg-muted/30";
}

export default function OpenDaysPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<OpenDay[]>([]);
  const [year, setYear] = useState<string>("");

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [shortlistSchoolIds, setShortlistSchoolIds] = useState<string[]>([]);

  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");

  const [commuteMap, setCommuteMap] = useState<Map<string, Commute>>(new Map());

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setError("Not signed in.");
        setLoading(false);
        return;
      }

      // Workspace (MVP assumes 1 per user)
      const { data: ws, error: wErr } = await supabase
        .from("workspaces")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (!mounted) return;

      if (wErr) {
        setError(wErr.message);
        setLoading(false);
        return;
      }

      setWorkspaceId(ws?.id ?? null);

      // Shortlist ids
      if (ws?.id) {
        const { data: shortlist, error: sErr } = await supabase
          .from("shortlists")
          .select("id")
          .eq("workspace_id", ws.id)
          .maybeSingle();

        if (!mounted) return;

        if (sErr && (sErr as any).code !== "PGRST116") {
          setError(sErr.message);
          setLoading(false);
          return;
        }

        if (shortlist?.id) {
          const { data: items, error: iErr } = await supabase
            .from("shortlist_items")
            .select("school_id")
            .eq("shortlist_id", shortlist.id);

          if (!mounted) return;

          if (iErr) {
            setError(iErr.message);
            setLoading(false);
            return;
          }

          const ids = ((items as any) ?? [])
            .map((x: any) => x.school_id as string)
            .filter(Boolean);

          setShortlistSchoolIds(ids);
        } else {
          setShortlistSchoolIds([]);
        }
      }

      // Open days
      const { data, error: qErr } = await supabase
        .from("open_days")
        .select(
          "id,school_id,school_name,starts_at,ends_at,location_text,info_url,school_year_label,last_synced_at,event_type,school:schools(id,name)"
        )
        .order("starts_at", { ascending: true });

      if (!mounted) return;

      if (qErr) {
        setError(qErr.message);
        setLoading(false);
        return;
      }

      const list = ((data as any) ?? []) as OpenDay[];
      setRows(list);
      if (list.length) setYear(list[0].school_year_label);

      // Commute cache (bike)
      if (ws?.id) {
        const { data: commutes, error: cErr } = await supabase
          .from("commute_cache")
          .select("school_id,duration_minutes,distance_km")
          .eq("workspace_id", ws.id)
          .eq("mode", "bike");

        if (!mounted) return;

        if (cErr) {
          console.warn("commute_cache load failed", cErr.message);
        } else {
          const m = new Map<string, Commute>();
          for (const c of (commutes as any) ?? []) {
            if (!c?.school_id) continue;
            m.set(c.school_id, {
              duration_minutes: Number(c.duration_minutes),
              distance_km: Number(c.distance_km),
            });
          }
          setCommuteMap(m);
        }
      }

      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const syncedAt = useMemo(() => {
    if (!rows.length) return null;
    return rows[0].last_synced_at;
  }, [rows]);

  const visibleRows = useMemo(() => {
    let list = rows;

    if (shortlistOnly) {
      const set = new Set(shortlistSchoolIds);
      list = list.filter((r) => {
        const sid = r.school?.id ?? r.school_id ?? null;
        return sid ? set.has(sid) : false;
      });
    }

    if (eventTypeFilter !== "all") {
      list = list.filter((r) => normalizeType(r.event_type) === eventTypeFilter);
    }

    if (dateRange !== "all") {
      const days = Number(dateRange);
      const now = new Date();
      const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      list = list.filter((r) => {
        if (!r.starts_at) return false;
        const d = new Date(r.starts_at);
        return d >= now && d <= end;
      });
    }

    return list;
  }, [rows, shortlistOnly, shortlistSchoolIds, eventTypeFilter, dateRange]);

  const grouped = useMemo(() => {
    const g = new Map<string, OpenDay[]>();
    for (const r of visibleRows) {
      const key = r.starts_at ? fmtDate(r.starts_at) : "Unknown date";
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(r);
    }
    return Array.from(g.entries());
  }, [visibleRows]);

  return (
    <main className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-3xl rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Open days</h1>
          <div className="flex gap-3">
            <Link className="text-sm underline" href="/schools">
              Schools
            </Link>
            <Link className="text-sm underline" href="/">
              Home
            </Link>
          </div>
        </div>

        <div className="rounded-lg border p-4 text-sm space-y-3">
          <div>
            <div className="font-medium">Important</div>
            <div className="text-muted-foreground">
              Open day details can change. Always verify on the school’s website before you go.
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground">
              {year ? (
                <>
                  Data: <span className="font-medium">{year}</span>
                  {syncedAt ? <> • Synced {new Date(syncedAt).toLocaleString("nl-NL")}</> : null}
                </>
              ) : null}
              {workspaceId ? null : null}
            </div>

            <label className="flex items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={shortlistOnly}
                onChange={(e) => setShortlistOnly(e.target.checked)}
              />
              <span className="text-sm">Shortlist only</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="text-xs text-muted-foreground mb-1">Event type</div>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="open_dag">Open dag</option>
                <option value="open_avond">Open avond</option>
                <option value="informatieavond">Info</option>
                <option value="proefles">Proefles</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="text-xs text-muted-foreground mb-1">When</div>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
              >
                <option value="all">All dates</option>
                <option value="7">Next 7 days</option>
                <option value="14">Next 14 days</option>
              </select>
            </label>
          </div>
        </div>

        {loading && <p className="text-sm">Loading…</p>}
        {!loading && error && <p className="text-sm text-red-600">Error: {error}</p>}

        {!loading && !error && rows.length === 0 && (
          <div className="text-sm">
            No open days loaded yet. Run the admin sync at{" "}
            <Link className="underline" href="/admin/sync-open-days">
              /admin/sync-open-days
            </Link>
            .
          </div>
        )}

        {!loading && !error && rows.length > 0 && visibleRows.length === 0 && (
          <div className="text-sm">
            No open days match your current filters (try widening date range, event type, or turning off{" "}
            <span className="font-medium">Shortlist only</span>).
          </div>
        )}

        {!loading && !error && visibleRows.length > 0 && (
          <div className="space-y-6">
            {grouped.map(([dateLabel, items]) => (
              <div key={dateLabel} className="space-y-2">
                <h2 className="text-lg font-semibold">{dateLabel}</h2>

                <ul className="divide-y rounded-lg border">
                  {items.map((r) => {
                    const label = eventTypeLabel(r.event_type);
                    const displayName = r.school?.name ?? stripTrailingUrlLabel(r.school_name);
                    const location = stripAnyUrlLabel(r.location_text);
                    const sid = r.school?.id ?? r.school_id ?? null;
                    const commute = sid ? commuteMap.get(sid) ?? null : null;

                    return (
                      <li key={r.id} className="p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-medium truncate">{displayName}</div>

                              {label && <span className={pillClass()}>{label}</span>}

                              {commute && (
                                <span className={pillClass()}>
                                  🚲 {commute.duration_minutes} min • {commute.distance_km} km
                                </span>
                              )}
                            </div>

                            <div className="text-sm text-muted-foreground">
                              {r.starts_at ? fmtTime(r.starts_at) : "—"}
                              {r.ends_at ? `–${fmtTime(r.ends_at)}` : ""}
                              {location ? ` • ${location}` : ""}
                            </div>
                          </div>

                          <div className="flex gap-2 sm:shrink-0 sm:justify-end">
                            {r.school?.id && (
                              <Link className={actionClass()} href={`/schools/${r.school.id}`}>
                                Notes
                              </Link>
                            )}

                            <a
                              className={actionClass()}
                              href={`/api/open-days/${r.id}/ics`}
                              target="_blank"
                              rel="noreferrer"
                              title="Download calendar invite (.ics)"
                            >
                              Calendar
                            </a>

                            {r.info_url && (
                              <a
                                className={actionClass()}
                                href={r.info_url}
                                target="_blank"
                                rel="noreferrer"
                                title="Open source page"
                              >
                                Source
                              </a>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}