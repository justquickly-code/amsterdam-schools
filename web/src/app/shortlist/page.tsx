"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { shortlistRankCapForLevels } from "@/lib/levels";
import { InfoCard, Wordmark } from "@/components/schoolkeuze";

type WorkspaceRow = { id: string; language?: Language | null; advies_levels?: string[] };

type ShortlistRow = { id: string; workspace_id: string };

type ShortlistItemRow = { school_id: string; rank: number | null; school?: { id: string; name: string } | null };

type ShortlistItemRowRaw = {
  school_id: string;
  rank: number | null;
  school?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
};

type ShortlistItem = {
  school_id: string;
  rank: number | null;
  school?: { id: string; name: string } | null;
  rating_stars?: number | null;
  attended?: boolean;
  commute?: { duration_minutes: number | null; distance_km: number | null } | null;
  has_planned?: boolean;
  has_open_days?: boolean;
};

type VisitRow = { school_id: string; rating_stars: number | null; attended: boolean | null };
type CommuteRow = { school_id: string; duration_minutes: number | null; distance_km: number | null };
type PlannedRow = { open_day?: { school_id: string | null } | Array<{ school_id: string | null }> | null };
type OpenDayRow = { school_id: string | null };

function sortItems(list: ShortlistItem[]) {
  return [...list].sort((a, b) => {
    const ar = typeof a.rank === "number" ? a.rank : 9999;
    const br = typeof b.rank === "number" ? b.rank : 9999;
    if (ar !== br) return ar - br;
    return (a.school?.name ?? "").localeCompare(b.school?.name ?? "");
  });
}

function commuteLabel(commute: ShortlistItem["commute"]) {
  if (!commute) return null;
  const parts: string[] = [];
  if (commute.duration_minutes != null) parts.push(`${commute.duration_minutes} min`);
  if (commute.distance_km != null) parts.push(`${commute.distance_km} km`);
  return parts.length ? `🚲 ${parts.join(" • ")}` : null;
}

function statusLabel(item: ShortlistItem, language: Language) {
  if (item.attended) return t(language, "schools.visited");
  if (item.has_planned) return t(language, "shortlist.planned");
  if (item.has_open_days) return t(language, "shortlist.no_plan");
  return t(language, "shortlist.no_open_days");
}

export default function ShortlistPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null);
  const [shortlistId, setShortlistId] = useState<string | null>(null);
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      setSavedMsg("");

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        router.replace("/login");
        return;
      }

      const { workspace: ws, error: wErr } = await fetchCurrentWorkspace<WorkspaceRow>(
        "id,language,advies_levels"
      );

      if (!mounted) return;

      const workspaceRow = (ws ?? null) as WorkspaceRow | null;
      if (wErr || !workspaceRow) {
        setError(wErr ?? "No workspace found.");
        setLoading(false);
        return;
      }
      setWorkspace(workspaceRow);
      setLanguage((workspaceRow.language as Language) ?? readStoredLanguage());

      // Ensure shortlist exists for workspace
      const { data: existing, error: sErr } = await supabase
        .from("shortlists")
        .select("id,workspace_id")
        .eq("workspace_id", workspaceRow.id)
        .maybeSingle();

      if (!mounted) return;

      if (sErr && sErr.code !== "PGRST116") {
        setError(sErr.message);
        setLoading(false);
        return;
      }

      const existingRow = (existing ?? null) as ShortlistRow | null;
      let sid = existingRow?.id as string | undefined;

      if (!sid) {
        const { data: created, error: cErr } = await supabase
          .from("shortlists")
          .insert({ workspace_id: workspaceRow.id })
          .select("id")
          .maybeSingle();

        if (cErr || !created) {
          setError(cErr?.message ?? "Could not create shortlist.");
          setLoading(false);
          return;
        }
        sid = (created as ShortlistRow).id;
      }

      setShortlistId(sid);

      // Load items with school names
      const { data: rows, error: iErr } = await supabase
        .from("shortlist_items")
        .select("school_id,rank,school:schools(id,name)")
        .eq("shortlist_id", sid)
        .order("rank", { ascending: true });

      if (!mounted) return;

      if (iErr) {
        setError(iErr.message);
        setLoading(false);
        return;
      }

      const normalized = (rows ?? []).map((row) => {
        const r = row as ShortlistItemRowRaw;
        const school = Array.isArray(r.school) ? r.school[0] ?? null : r.school ?? null;
        return { school_id: r.school_id, rank: r.rank, school } as ShortlistItemRow;
      });
      const schoolIds = normalized.map((x) => x.school_id).filter(Boolean);

      let visits: VisitRow[] = [];
      let commutes: CommuteRow[] = [];
      let plannedRows: PlannedRow[] = [];
      let openDayRows: OpenDayRow[] = [];

      if (workspaceRow.id && schoolIds.length) {
        const [{ data: visitRows }, { data: commuteRows }, { data: planned }, { data: openDays }] = await Promise.all([
          supabase
            .from("visits")
            .select("school_id,rating_stars,attended")
            .eq("workspace_id", workspaceRow.id)
            .in("school_id", schoolIds),
          supabase
            .from("commute_cache")
            .select("school_id,duration_minutes,distance_km")
            .eq("workspace_id", workspaceRow.id)
            .eq("mode", "bike")
            .in("school_id", schoolIds),
          supabase
            .from("planned_open_days")
            .select("open_day:open_days(school_id)")
            .eq("workspace_id", workspaceRow.id),
          supabase
            .from("open_days")
            .select("school_id")
            .in("school_id", schoolIds),
        ]);

        if (!mounted) return;
        visits = (visitRows ?? []) as VisitRow[];
        commutes = (commuteRows ?? []) as CommuteRow[];
        plannedRows = (planned ?? []) as PlannedRow[];
        openDayRows = (openDays ?? []) as OpenDayRow[];
      }

      const visitMap = new Map(visits.map((v) => [v.school_id, v]));
      const commuteMap = new Map(commutes.map((c) => [c.school_id, c]));
      const plannedSet = new Set(
        plannedRows
          .map((row) => {
            const openDay = Array.isArray(row.open_day) ? row.open_day[0] ?? null : row.open_day ?? null;
            return openDay?.school_id ?? null;
          })
          .filter(Boolean) as string[]
      );
      const openDaySet = new Set(
        openDayRows.map((row) => row.school_id).filter(Boolean) as string[]
      );

      setItems(
        sortItems(
          normalized.map((item) => ({
            ...item,
            rating_stars: visitMap.get(item.school_id)?.rating_stars ?? null,
            attended: Boolean(visitMap.get(item.school_id)?.attended),
            commute: commuteMap.get(item.school_id) ?? null,
            has_planned: plannedSet.has(item.school_id),
            has_open_days: openDaySet.has(item.school_id),
          }))
        )
      );
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    const onLang = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next) setLanguage(next);
    };
    window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
  }, []);

  const rankCap = useMemo(
    () => shortlistRankCapForLevels(workspace?.advies_levels ?? []),
    [workspace]
  );

  const rankMap = useMemo(() => {
    const m = new Map<number, ShortlistItem>();
    for (const it of items) {
      if (typeof it.rank === "number" && it.rank <= rankCap) m.set(it.rank, it);
    }
    return m;
  }, [items, rankCap]);

  const takenRanks = useMemo(() => {
    return new Set<number>(
      items
        .map((it) => it.rank)
        .filter((r): r is number => typeof r === "number" && r <= rankCap)
    );
  }, [items, rankCap]);

  function nextAvailableRank() {
    for (let r = 1; r <= rankCap; r++) {
      if (!takenRanks.has(r)) return r;
    }
    return null;
  }

  async function clearRank(rank: number) {
    if (!shortlistId) return;
    const existing = rankMap.get(rank);
    if (!existing) return;

    setSaving(true);
    setError("");
    setSavedMsg("");

    const { error } = await supabase
      .from("shortlist_items")
      .update({ rank: null })
      .eq("shortlist_id", shortlistId)
      .eq("school_id", existing.school_id);

    if (error) setError(error.message);
    else {
      setItems((prev) =>
        sortItems(prev.map((x) => (x.school_id === existing.school_id ? { ...x, rank: null } : x)))
      );
      setSavedMsg(t(language, "shortlist.saved"));
    }

    setSaving(false);
  }

  async function removeSchool(schoolId: string) {
    if (!shortlistId) return;
    setSaving(true);
    setError("");
    setSavedMsg("");

    const { error } = await supabase
      .from("shortlist_items")
      .delete()
      .eq("shortlist_id", shortlistId)
      .eq("school_id", schoolId);

    if (error) setError(error.message);
    else {
      setItems((prev) => prev.filter((x) => x.school_id !== schoolId));
      setSavedMsg(t(language, "shortlist.saved"));
    }

    setSaving(false);
  }

  async function move(fromRank: number, toRank: number) {
    if (!shortlistId) return;
    if (fromRank === toRank) return;
    if (toRank > rankCap) return;

    const a = rankMap.get(fromRank);
    const b = rankMap.get(toRank);
    if (!a) return;

    setSaving(true);
    setError("");
    setSavedMsg("");

    // If target occupied, swap ranks via 2 updates.
    if (b) {
      const { error: rpcErr } = await supabase.rpc("swap_shortlist_ranks", {
        p_shortlist_id: shortlistId,
        p_rank_a: fromRank,
        p_rank_b: toRank,
      });
    
      if (rpcErr) {
        setError(rpcErr.message);
        setSaving(false);
        return;
      }
    
      // Update UI locally (swap ranks)
      setItems((prev) =>
        sortItems(
          prev.map((x) =>
            x.school_id === a.school_id
              ? { ...x, rank: toRank }
              : x.school_id === b.school_id
              ? { ...x, rank: fromRank }
              : x
          )
        )
      );
    
      setSavedMsg(t(language, "shortlist.saved"));
      setSaving(false);
      return;
    }

    // Empty target: just update one row
    const { error } = await supabase
      .from("shortlist_items")
      .update({ rank: toRank })
      .eq("shortlist_id", shortlistId)
      .eq("school_id", a.school_id);

    if (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code === "23505") {
        // Retry once: refresh list and attempt update again.
        const { data: rows } = await supabase
          .from("shortlist_items")
          .select("school_id,rank,school:schools(id,name)")
          .eq("shortlist_id", shortlistId)
          .order("rank", { ascending: true });

        const normalized = (rows ?? []).map((row) => {
          const r = row as ShortlistItemRowRaw;
          const school = Array.isArray(r.school) ? r.school[0] ?? null : r.school ?? null;
          return { school_id: r.school_id, rank: r.rank, school } as ShortlistItemRow;
        });
        setItems(normalized);

        const { error: retryErr } = await supabase
          .from("shortlist_items")
          .update({ rank: toRank })
          .eq("shortlist_id", shortlistId)
          .eq("school_id", a.school_id);

        if (retryErr) setError(retryErr.message);
        else {
          setItems((prev) =>
            sortItems(prev.map((x) => (x.rank === fromRank ? { ...x, rank: toRank } : x)))
          );
          setSavedMsg(t(language, "shortlist.saved"));
        }
      } else {
        setError(error.message);
      }
    }
    else {
      setItems((prev) =>
        sortItems(prev.map((x) => (x.rank === fromRank ? { ...x, rank: toRank } : x)))
      );
      setSavedMsg(t(language, "shortlist.saved"));
    }

    setSaving(false);
  }

  async function promoteToNextRank(item: ShortlistItem) {
    if (!shortlistId) return;
    const nextRank = nextAvailableRank();
    const targetRank = nextRank ?? rankCap;

    setSaving(true);
    setError("");
    setSavedMsg("");

    if (!nextRank) {
      const bottom = rankMap.get(rankCap);
      if (bottom) {
        const { error: dropErr } = await supabase
          .from("shortlist_items")
          .update({ rank: null })
          .eq("shortlist_id", shortlistId)
          .eq("school_id", bottom.school_id);
        if (dropErr) {
          setError(dropErr.message);
          setSaving(false);
          return;
        }
      }
    }

    const { error } = await supabase
      .from("shortlist_items")
      .update({ rank: targetRank })
      .eq("shortlist_id", shortlistId)
      .eq("school_id", item.school_id);

    if (error) {
      setError(error.message);
    } else {
      setItems((prev) =>
        sortItems(
          prev.map((x) => {
            if (x.school_id === item.school_id) return { ...x, rank: targetRank };
            if (!nextRank && x.rank === rankCap) return { ...x, rank: null };
            return x;
          })
        )
      );
      setSavedMsg(t(language, "shortlist.saved"));
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-5xl items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col gap-2">
          <Wordmark />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">
                {t(language, "shortlist.title")}
              </h1>
              <p className="text-sm text-muted-foreground">{t(language, "shortlist.subtitle")}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              {t(language, "shortlist.rank_cap")}: <span className="font-semibold text-foreground">{rankCap}</span>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Error: {error}
          </div>
        )}
        {savedMsg && (
          <div className="rounded-2xl border border-info-muted bg-info-muted px-4 py-3 text-sm text-foreground">
            {savedMsg}
          </div>
        )}

        <InfoCard title={t(language, "shortlist.title")}>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t(language, "shortlist.empty_list")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {sortItems(items).map((it) => {
                const isRanked = typeof it.rank === "number" && it.rank <= rankCap;
                const rankLabel = isRanked ? `${t(language, "shortlist.rank")} ${it.rank}` : null;
                return (
                  <li
                    key={it.school_id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-1 select-none text-muted-foreground">⋮⋮</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {rankLabel ? (
                            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                              {rankLabel}
                            </span>
                          ) : (
                            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                              {t(language, "shortlist.saved_title")}
                            </span>
                          )}
                          {isRanked && (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
                              Top {rankCap}
                            </span>
                          )}
                          {(it.attended || it.has_planned || it.has_open_days) && (
                            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                              {statusLabel(it, language)}
                            </span>
                          )}
                        </div>
                        <Link
                          className="mt-2 block truncate text-base font-semibold text-primary underline underline-offset-2 hover:decoration-2"
                          href={`/schools/${it.school_id}?from=shortlist`}
                        >
                          {it.school?.name ?? it.school_id}
                        </Link>
                        {(it.rating_stars || commuteLabel(it.commute)) && (
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {it.rating_stars ? (
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
                                ★ {it.rating_stars}/5
                              </span>
                            ) : null}
                            {commuteLabel(it.commute) ? <span>{commuteLabel(it.commute)}</span> : null}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isRanked ? (
                        <>
                          <button
                            className="rounded-full border px-2 py-1 text-xs"
                            disabled={saving || !it.rank || it.rank === 1}
                            onClick={() => it.rank && move(it.rank, it.rank - 1)}
                          >
                            ↑
                          </button>
                          <button
                            className="rounded-full border px-2 py-1 text-xs"
                            disabled={saving || !it.rank || it.rank === rankCap}
                            onClick={() => it.rank && move(it.rank, it.rank + 1)}
                          >
                            ↓
                          </button>
                          <button
                            className="rounded-full border px-3 py-1 text-xs"
                            disabled={saving || !it.rank}
                            onClick={() => it.rank && clearRank(it.rank)}
                          >
                            {t(language, "shortlist.unrank")}
                          </button>
                        </>
                      ) : (
                        <button
                          className="rounded-full border px-3 py-1 text-xs"
                          disabled={saving}
                          onClick={() => promoteToNextRank(it)}
                        >
                          {t(language, "shortlist.add_to_ranked")}
                        </button>
                      )}
                      <button
                        className="text-xs text-muted-foreground underline"
                        onClick={() => removeSchool(it.school_id)}
                        disabled={saving}
                      >
                        {t(language, "shortlist.remove")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </InfoCard>

      </div>
    </main>
  );
}
