"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, getLocale, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";

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
  is_active?: boolean;
  missing_since?: string | null;
  school?: { id: string; name: string } | null;
};

type OpenDayRow = {
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
  is_active?: boolean;
  missing_since?: string | null;
  school?: Array<{ id: string; name: string } | null> | null;
};

type WorkspaceRow = {
  id: string;
  home_postcode?: string | null;
  home_house_number?: string | null;
  language?: Language | null;
};

type ShortlistRow = {
  id: string;
};

type ShortlistItemRow = {
  school_id: string;
};

type PlannedOpenDayRow = {
  open_day_id: string;
};

function stripTrailingUrlLabel(s: string) {
  return (s ?? "").replace(/\s*\(https?:\/\/[^)]+\)\s*$/i, "").trim();
}

function stripAnyUrlLabel(s: string | null) {
  if (!s) return null;
  return s.replace(/\s*\(https?:\/\/[^)]+\)\s*/gi, " ").replace(/\s+/g, " ").trim();
}

function fmtDate(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fmtTime(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  open_dag: "Open dag",
  open_avond: "Open avond",
  informatieavond: "Info-avond",
  proefles: "Proefles",
  other: "Other",
};

function normalizeEventType(t: string | null) {
  const raw = (t ?? "").toLowerCase().trim();
  if (!raw) return "other";
  if (raw.includes("open_dag") || raw.includes("open dag")) return "open_dag";
  if (raw.includes("open_avond") || raw.includes("open avond")) return "open_avond";
  if (raw.includes("informatieavond") || raw.includes("infoavond") || raw.includes("info-avond")) return "informatieavond";
  if (raw.includes("proefles") || raw.includes("meeloop") || raw.includes("lesjes")) return "proefles";
  return "other";
}

function eventTypeLabel(t: string | null) {
  return EVENT_TYPE_LABELS[normalizeEventType(t)] ?? null;
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

  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [shortlistSchoolIds, setShortlistSchoolIds] = useState<string[]>([]);

  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [plannedIds, setPlannedIds] = useState<Set<string>>(new Set());
  const autoComputeDone = useRef(false);

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
      const { workspace: ws, error: wErr } = await fetchCurrentWorkspace<WorkspaceRow>(
        "id,home_postcode,home_house_number,language"
      );

      if (!mounted) return;

      if (wErr) {
        setError(wErr);
        setLoading(false);
        return;
      }

      const wsRow = (ws ?? null) as WorkspaceRow | null;
      setWorkspace(wsRow);
      setWorkspaceId(wsRow?.id ?? null);
      setLanguage((wsRow?.language as Language) ?? readStoredLanguage());

      // Planned open days
      if (wsRow?.id) {
        const { data: planned, error: pErr } = await supabase
          .from("planned_open_days")
          .select("open_day_id")
          .eq("workspace_id", wsRow.id);

        if (!mounted) return;

        if (pErr) {
          setError(pErr.message);
          setLoading(false);
          return;
        }

        const plannedRows = (planned ?? []) as PlannedOpenDayRow[];
        setPlannedIds(new Set(plannedRows.map((p) => p.open_day_id)));
      } else {
        setPlannedIds(new Set());
      }

      // Shortlist ids
      const workspaceRow = wsRow;
      if (workspaceRow?.id) {
        const { data: shortlist, error: sErr } = await supabase
          .from("shortlists")
          .select("id")
          .eq("workspace_id", workspaceRow.id)
          .maybeSingle();

        if (!mounted) return;

        const sErrCode = (sErr as { code?: string } | null)?.code;
        if (sErr && sErrCode !== "PGRST116") {
          setError(sErr.message);
          setLoading(false);
          return;
        }

        const shortlistRow = (shortlist ?? null) as ShortlistRow | null;
        if (shortlistRow?.id) {
          const { data: items, error: iErr } = await supabase
            .from("shortlist_items")
            .select("school_id")
            .eq("shortlist_id", shortlistRow.id);

          if (!mounted) return;

          if (iErr) {
            setError(iErr.message);
            setLoading(false);
            return;
          }

          const ids = ((items ?? []) as ShortlistItemRow[])
            .map((x) => x.school_id)
            .filter(Boolean);

          setShortlistSchoolIds(ids);
        } else {
          setShortlistSchoolIds([]);
        }
      }

      // Open days
      let query = supabase
        .from("open_days")
        .select(
          "id,school_id,school_name,starts_at,ends_at,location_text,info_url,school_year_label,last_synced_at,event_type,is_active,missing_since,school:schools(id,name)"
        );

      query = query.eq("is_active", true);

      const { data, error: qErr } = await query.order("starts_at", { ascending: true });

      if (!mounted) return;

      if (qErr) {
        setError(qErr.message);
        setLoading(false);
        return;
      }

      const list = (data ?? []).map((row) => {
        const r = row as OpenDayRow;
        return {
          id: r.id,
          school_id: r.school_id ?? null,
          school_name: r.school_name ?? "",
          starts_at: r.starts_at ?? null,
          ends_at: r.ends_at ?? null,
          location_text: r.location_text ?? null,
          info_url: r.info_url ?? null,
          school_year_label: r.school_year_label ?? "",
          last_synced_at: r.last_synced_at ?? "",
          event_type: r.event_type ?? null,
          is_active: r.is_active,
          missing_since: r.missing_since ?? null,
          school: r.school?.[0] ?? null,
        } as OpenDay;
      });
      setRows(list);

      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function downloadIcs(openDayId: string) {
    setDownloadingId(openDayId);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? "";
      if (!token) {
        setError("You must be logged in to download the calendar invite.");
        return;
      }

      const res = await fetch(`/api/open-days/${openDayId}/ics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Calendar download failed");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") ?? "";
      const match = contentDisposition.match(/filename="([^"]+)"/i);
      const filename = match?.[1] ?? "open-day.ics";

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Calendar download failed";
      setError(msg);
    } finally {
      setDownloadingId(null);
    }
  }

  async function togglePlanned(openDayId: string) {
    if (!workspaceId) return;
    setPlanningId(openDayId);
    setError("");

    const isPlanned = plannedIds.has(openDayId);
    if (isPlanned) {
      const { error: delErr } = await supabase
        .from("planned_open_days")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("open_day_id", openDayId);

      if (delErr) {
        setError(delErr.message);
        setPlanningId(null);
        return;
      }

      setPlannedIds((prev) => {
        const next = new Set(prev);
        next.delete(openDayId);
        return next;
      });
      setPlanningId(null);
      return;
    }

    const { error: insErr } = await supabase.from("planned_open_days").insert({
      workspace_id: workspaceId,
      open_day_id: openDayId,
      planned_at: new Date().toISOString(),
    });

    if (insErr) {
      setError(insErr.message);
    } else {
      setPlannedIds((prev) => new Set(prev).add(openDayId));
    }

    setPlanningId(null);
  }

  useEffect(() => {
    if (loading || autoComputeDone.current) return;
    if (!workspace?.id) return;
    autoComputeDone.current = true;
  }, [loading, workspace]);

  useEffect(() => {
    function onLang(e: Event) {
      const next = (e as CustomEvent<Language>).detail;
      if (next) setLanguage(next);
    }
    window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
  }, []);

  const yearOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.school_year_label).filter(Boolean));
    const list = Array.from(set);
    list.sort((a, b) => {
      const aYear = Number.parseInt(a.split("/")[0] ?? "0", 10);
      const bYear = Number.parseInt(b.split("/")[0] ?? "0", 10);
      return bYear - aYear;
    });
    return list;
  }, [rows]);

  useEffect(() => {
    if (yearOptions.length === 0) {
      if (year !== "") setYear("");
      return;
    }
    if (!year || !yearOptions.includes(year)) {
      setYear(yearOptions[0]);
    }
  }, [yearOptions, year]);

  const rowsForYear = useMemo(() => {
    if (!year) return rows;
    return rows.filter((r) => r.school_year_label === year);
  }, [rows, year]);

  const syncedAt = useMemo(() => {
    let latest: string | null = null;
    for (const r of rowsForYear) {
      if (!r.last_synced_at) continue;
      if (!latest) {
        latest = r.last_synced_at;
        continue;
      }
      if (new Date(r.last_synced_at).getTime() > new Date(latest).getTime()) {
        latest = r.last_synced_at;
      }
    }
    return latest;
  }, [rowsForYear]);

  const visibleRows = useMemo(() => {
    let list = rowsForYear;

    if (shortlistOnly) {
      const set = new Set(shortlistSchoolIds);
      list = list.filter((r) => {
        const sid = r.school?.id ?? r.school_id ?? null;
        return sid ? set.has(sid) : false;
      });
    }

    if (eventTypeFilter !== "all") {
      list = list.filter((r) => normalizeEventType(r.event_type) === eventTypeFilter);
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
  }, [rowsForYear, shortlistOnly, shortlistSchoolIds, eventTypeFilter, dateRange]);

  const grouped = useMemo(() => {
    const g = new Map<string, OpenDay[]>();
    for (const r of visibleRows) {
      const locale = getLocale(language);
      const key = r.starts_at ? fmtDate(r.starts_at, locale) : "Unknown date";
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(r);
    }
    return Array.from(g.entries());
  }, [visibleRows, language]);

  return (
    <main className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-3xl rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t(language, "open_days.title")}</h1>
        </div>

        <div className="rounded-lg border p-4 text-sm space-y-3">
          <div>
            <div className="font-medium">
              {t(language, "open_days.important")}
            </div>
            <div className="text-muted-foreground">
              {t(language, "open_days.important_body")}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground">
              {year ? (
                <>
                  Data: <span className="font-medium">{year}</span>
                  {syncedAt ? (
                    <>
                      {" "}
                      • Synced{" "}
                      {new Date(syncedAt).toLocaleString(getLocale(language))}
                    </>
                  ) : null}
                </>
              ) : null}
              {workspaceId ? null : null}
            </div>

            <div className="flex items-center gap-4">
              {yearOptions.length > 1 && (
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Year</span>
                  <select
                    className="rounded-md border px-2 py-1 text-sm"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={shortlistOnly}
                  onChange={(e) => setShortlistOnly(e.target.checked)}
                />
                <span className="text-sm">{t(language, "open_days.shortlist_only")}</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="text-xs text-muted-foreground mb-1">
                {t(language, "open_days.event_type")}
              </div>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="open_dag">Open dag</option>
                <option value="open_avond">Open avond</option>
                <option value="informatieavond">Info-avond</option>
                <option value="proefles">Proefles</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="text-xs text-muted-foreground mb-1">
                {t(language, "open_days.when")}
              </div>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
              >
                <option value="all">
                  {t(language, "open_days.all_dates")}
                </option>
                <option value="7">
                  {t(language, "open_days.next7")}
                </option>
                <option value="14">
                  {t(language, "open_days.next14")}
                </option>
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
                    const locale = getLocale(language);
                    const planned = plannedIds.has(r.id);
                    return (
                      <li key={r.id} className="p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-medium truncate">{displayName}</div>

                              {label && <span className={pillClass()}>{label}</span>}

                              {planned && <span className={pillClass()}>Planned</span>}

                              {r.is_active === false && <span className={pillClass()}>Verify</span>}

                            </div>

                            <div className="text-sm text-muted-foreground">
                              {r.starts_at ? fmtTime(r.starts_at, locale) : "—"}
                              {r.ends_at ? `–${fmtTime(r.ends_at, locale)}` : ""}
                              {location ? ` • ${location}` : ""}
                            </div>

                            {r.missing_since ? (
                              <div className="text-xs text-muted-foreground">
                                Missing since: {r.missing_since}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex gap-2 sm:shrink-0 sm:justify-end">
                            {r.school?.id && (
                              <Link className={actionClass()} href={`/schools/${r.school.id}`}>
                                Notes
                              </Link>
                            )}

                            <button
                              className={actionClass()}
                              type="button"
                              onClick={() => togglePlanned(r.id)}
                              disabled={planningId === r.id}
                              title="Mark as planned"
                            >
                              {planningId === r.id ? "Saving..." : planned ? "Planned" : "Plan"}
                            </button>

                            <button
                              className={actionClass()}
                              type="button"
                              onClick={() => downloadIcs(r.id)}
                              disabled={downloadingId === r.id}
                              title="Download calendar invite (.ics)"
                            >
                              {downloadingId === r.id ? "Downloading..." : "Calendar"}
                            </button>

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
