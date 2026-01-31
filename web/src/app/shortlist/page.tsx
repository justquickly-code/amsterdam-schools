"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { shortlistRankCapForLevels } from "@/lib/levels";
import { computeFitPercent } from "@/lib/categoryRatings";
import { badgeNeutral, badgeSecondary, badgeStrong, fitBadgeClass } from "@/lib/badges";
import { buttonOutlineSmall } from "@/lib/ui";
import { InfoCard, SchoolRow } from "@/components/schoolkeuze";
import { ArrowDown, ArrowUp, Bike, Star } from "lucide-react";

type WorkspaceRow = { id: string; language?: Language | null; advies_levels?: string[] };

type ShortlistRow = { id: string; workspace_id: string };

type ShortlistItemRow = {
  school_id: string;
  rank: number | null;
  school?: { id: string; name: string; image_url?: string | null } | null;
};

type ShortlistItemRowRaw = {
  school_id: string;
  rank: number | null;
  school?: { id: string; name: string; image_url?: string | null } | Array<{ id: string; name: string; image_url?: string | null }> | null;
};

type ShortlistItem = {
  school_id: string;
  rank: number | null;
  school?: { id: string; name: string; image_url?: string | null } | null;
  rating_stars?: number | null;
  attended?: boolean;
  commute?: { duration_minutes: number | null; distance_km: number | null } | null;
  has_planned?: boolean;
  has_open_days?: boolean;
  fit_score?: number | null;
};

type VisitRow = { school_id: string; rating_stars: number | null; attended: boolean | null };
type CommuteRow = { school_id: string; duration_minutes: number | null; distance_km: number | null };
type PlannedRow = { open_day?: { school_id: string | null } | Array<{ school_id: string | null }> | null };
type OpenDayRow = { school_id: string | null };
type CategoryRatingRow = { school_id: string; rating: number | null };

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
  return parts.length ? parts.join(" • ") : null;
}

function statusLabel(item: ShortlistItem, language: Language) {
  if (item.attended) return t(language, "schools.visited");
  if (item.has_planned) return t(language, "shortlist.planned");
  if (item.has_open_days) return t(language, "shortlist.no_plan");
  return t(language, "shortlist.no_open_days");
}

type BadgeClass = string;

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
        .select("school_id,rank,school:schools(id,name,image_url)")
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
      let categoryRows: CategoryRatingRow[] = [];

      if (workspaceRow.id && schoolIds.length) {
        const [
          { data: visitRows },
          { data: commuteRows },
          { data: planned },
          { data: openDays },
          { data: categoryRatings },
        ] = await Promise.all([
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
          supabase
            .from("school_category_ratings")
            .select("school_id,rating")
            .eq("workspace_id", workspaceRow.id)
            .in("school_id", schoolIds),
        ]);

        if (!mounted) return;
        visits = (visitRows ?? []) as VisitRow[];
        commutes = (commuteRows ?? []) as CommuteRow[];
        plannedRows = (planned ?? []) as PlannedRow[];
        openDayRows = (openDays ?? []) as OpenDayRow[];
        categoryRows = (categoryRatings ?? []) as CategoryRatingRow[];
      }

      const visitMap = new Map(visits.map((v) => [v.school_id, v]));
      const commuteMap = new Map(commutes.map((c) => [c.school_id, c]));
      const categoryMap = new Map<string, number[]>();
      for (const row of categoryRows) {
        if (typeof row.rating !== "number") continue;
        const list = categoryMap.get(row.school_id) ?? [];
        list.push(row.rating);
        categoryMap.set(row.school_id, list);
      }
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
            fit_score: computeFitPercent(categoryMap.get(item.school_id) ?? []),
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
          .select("school_id,rank,school:schools(id,name,image_url)")
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
    <main className="min-h-screen pb-24">
      <header className="relative -mt-4 overflow-hidden min-h-[260px] md:min-h-[320px]">
        <div className="absolute inset-0">
          <Image src="/branding/hero/hero-bg.jpg" alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
        </div>
        <div className="relative px-5 pt-10 pb-12">
          <div className="mx-auto w-full max-w-5xl">
            <h1 className="text-3xl font-serif font-semibold text-white drop-shadow-sm">
              {t(language, "shortlist.title")}
            </h1>
            <p className="mt-2 text-sm text-white/90">
              {t(language, "shortlist.subtitle").replace("{cap}", String(rankCap))}
            </p>
          </div>
        </div>
      </header>

      <section className="bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">

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
            <ul className="space-y-3">
              {sortItems(items).map((it) => {
                const isRanked = typeof it.rank === "number" && it.rank <= rankCap;
                const rankLabel = isRanked ? `${t(language, "shortlist.rank")} ${it.rank}` : null;
                return (
                  <li key={it.school_id}>
                    <SchoolRow
                      name={it.school?.name ?? it.school_id}
                      href={`/schools/${it.school_id}?from=shortlist`}
                      imageUrl={it.school?.image_url ?? undefined}
                      badges={
                        <>
                          {rankLabel ? (
                            <span className={`${badgeNeutral} bg-white text-foreground`}>
                              {rankLabel}
                            </span>
                          ) : (
                            <span className={`${badgeNeutral} bg-muted`}>
                              {t(language, "shortlist.not_ranked")}
                            </span>
                          )}
                          {(it.attended || it.has_planned || it.has_open_days) ? (
                            <span className={badgeNeutral}>{statusLabel(it, language)}</span>
                          ) : null}
                        </>
                      }
                      meta={
                        <>
                          {it.rating_stars ? (
                            <span className={`inline-flex items-center gap-1 ${badgeSecondary}`}>
                              <Star className="h-3.5 w-3.5 fill-current" />
                              {it.rating_stars}/5
                            </span>
                          ) : null}
                          {commuteLabel(it.commute) ? (
                            <span className="inline-flex items-center gap-2">
                              <Bike className="h-4 w-4" />
                              {commuteLabel(it.commute)}
                            </span>
                          ) : null}
                        </>
                      }
                      cornerBadge={
                        typeof it.fit_score === "number" ? (
                          <span className={`${badgeStrong} ${fitBadgeClass(it.fit_score)}`}>
                            {Math.round(it.fit_score)}% {t(language, "shortlist.fit_label")}
                          </span>
                        ) : null
                      }
                      action={
                        <>
                          <button
                            className={buttonOutlineSmall}
                            disabled={saving || (isRanked && it.rank === 1)}
                            onClick={() => (isRanked && it.rank ? move(it.rank, it.rank - 1) : promoteToNextRank(it))}
                            aria-label={t(language, "shortlist.move_up")}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            className={buttonOutlineSmall}
                            disabled={saving || !isRanked || !it.rank || it.rank === rankCap}
                            onClick={() => it.rank && move(it.rank, it.rank + 1)}
                            aria-label={t(language, "shortlist.move_down")}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            className="text-xs text-muted-foreground underline"
                            onClick={() => removeSchool(it.school_id)}
                            disabled={saving}
                          >
                            {t(language, "shortlist.remove")}
                          </button>
                        </>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </InfoCard>
        </div>
      </section>
    </main>
  );
}
