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

export default function OpenDaysPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<OpenDay[]>([]);
  const [year, setYear] = useState<string>("");

  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [shortlistSchoolIds, setShortlistSchoolIds] = useState<string[]>([]);

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

      // Load current workspace (assumes 1 workspace per user in MVP)
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

      // Load shortlist school ids (if any)
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
    if (!shortlistOnly) return rows;

    const set = new Set(shortlistSchoolIds);
    return rows.filter((r) => {
      const sid = r.school?.id ?? r.school_id ?? null;
      return sid ? set.has(sid) : false;
    });
  }, [rows, shortlistOnly, shortlistSchoolIds]);

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

        <div className="rounded-lg border p-3 text-sm space-y-2">
          <div>
            <div className="font-medium">Important</div>
            <div className="text-muted-foreground">
              Open day details can change. Always verify on the school’s website before you go.
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-muted-foreground">
              {year ? (
                <>
                  Data: <span className="font-medium">{year}</span>
                  {syncedAt ? <> • Synced {new Date(syncedAt).toLocaleString("nl-NL")}</> : null}
                </>
              ) : null}
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
            No open days match your current view (try turning off{" "}
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

                    return (
                      <li key={r.id} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-medium">{displayName}</div>
                              {label && (
                                <span className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground">
                                  {label}
                                </span>
                              )}
                            </div>

                            <div className="text-sm text-muted-foreground">
                              {r.starts_at ? fmtTime(r.starts_at) : "—"}
                              {r.ends_at ? `–${fmtTime(r.ends_at)}` : ""}
                              {location ? ` • ${location}` : ""}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {r.school?.id && (
                              <Link className="text-xs underline" href={`/schools/${r.school.id}`}>
                                notes
                              </Link>
                            )}
                            {r.info_url && (
                              <a
                                className="text-xs underline"
                                href={r.info_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                source
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