"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { shortlistRankCapForLevels } from "@/lib/levels";
import { InfoCard } from "@/components/schoolkeuze";

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
  commute?: { duration_minutes: number | null; distance_km: number | null } | null;
};

type VisitRow = { school_id: string; rating_stars: number | null };
type CommuteRow = { school_id: string; duration_minutes: number | null; distance_km: number | null };

function sortItems(list: ShortlistItem[]) {
  return [...list].sort((a, b) => {
    const ar = typeof a.rank === "number" ? a.rank : 9999;
    const br = typeof b.rank === "number" ? b.rank : 9999;
    if (ar !== br) return ar - br;
    return (a.school?.name ?? "").localeCompare(b.school?.name ?? "");
  });
}

export default function ShortlistPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
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
        setError("Not signed in.");
        setLoading(false);
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
      setWorkspaceId(workspaceRow.id);
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

      if (workspaceRow.id && schoolIds.length) {
        const [{ data: visitRows }, { data: commuteRows }] = await Promise.all([
          supabase
            .from("visits")
            .select("school_id,rating_stars")
            .eq("workspace_id", workspaceRow.id)
            .in("school_id", schoolIds),
          supabase
            .from("commute_cache")
            .select("school_id,duration_minutes,distance_km")
            .eq("workspace_id", workspaceRow.id)
            .eq("mode", "bike")
            .in("school_id", schoolIds),
        ]);

        if (!mounted) return;
        visits = (visitRows ?? []) as VisitRow[];
        commutes = (commuteRows ?? []) as CommuteRow[];
      }

      const visitMap = new Map(visits.map((v) => [v.school_id, v]));
      const commuteMap = new Map(commutes.map((c) => [c.school_id, c]));

      setItems(
        sortItems(
          normalized.map((item) => ({
            ...item,
            rating_stars: visitMap.get(item.school_id)?.rating_stars ?? null,
            commute: commuteMap.get(item.school_id) ?? null,
          }))
        )
      );
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

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

  const unranked = useMemo(
    () =>
      items
        .filter((it) => typeof it.rank !== "number" || it.rank > rankCap)
        .sort((a, b) => (a.school?.name ?? "").localeCompare(b.school?.name ?? "")),
    [items, rankCap]
  );

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

  async function removeRank(rank: number) {
    if (!shortlistId) return;
    const existing = rankMap.get(rank);
    if (!existing) return;

    setSaving(true);
    setError("");
    setSavedMsg("");

    const { error } = await supabase
      .from("shortlist_items")
      .delete()
      .eq("shortlist_id", shortlistId)
      .eq("school_id", existing.school_id);

    if (error) setError(error.message);
    else {
      setItems((prev) => prev.filter((x) => x.rank !== rank));
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t(language, "shortlist.title")}
          </p>
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
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: rankCap }).map((_, i) => {
              const rank = i + 1;
              const it = rankMap.get(rank);
              return (
                <div key={rank} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-muted-foreground">
                      {t(language, "shortlist.rank")} #{rank}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-full border px-2 py-1 text-xs"
                        disabled={saving || !it || rank === 1}
                        onClick={() => move(rank, rank - 1)}
                      >
                        ↑
                      </button>
                      <button
                        className="rounded-full border px-2 py-1 text-xs"
                        disabled={saving || !it || rank === rankCap}
                        onClick={() => move(rank, rank + 1)}
                      >
                        ↓
                      </button>
                    </div>
                  </div>

                  <div className="min-h-12">
                    {it ? (
                      <div className="space-y-2">
                        <Link
                          className="text-sm font-semibold text-primary hover:underline"
                          href={`/schools/${it.school_id}?from=shortlist`}
                        >
                          {it.school?.name ?? it.school_id}
                        </Link>
                        {(it.rating_stars || it.commute?.distance_km != null) && (
                          <div className="text-xs text-muted-foreground">
                            {it.rating_stars ? `★ ${it.rating_stars}/5` : ""}
                            {it.commute?.distance_km != null
                              ? `${it.rating_stars ? " • " : ""}🚲 ${it.commute.distance_km} km`
                              : ""}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">{t(language, "shortlist.empty_slot")}</div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    {it && (
                      <button
                        className="text-xs text-muted-foreground underline"
                        onClick={() => removeRank(rank)}
                        disabled={saving}
                      >
                        {t(language, "shortlist.remove")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </InfoCard>

        {unranked.length ? (
          <InfoCard title={t(language, "shortlist.saved_title")}>
            <ul className="divide-y divide-border">
              {unranked.map((it) => (
                <li key={it.school_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <Link
                    className="truncate text-sm font-semibold text-primary hover:underline"
                    href={`/schools/${it.school_id}?from=shortlist`}
                  >
                    {it.school?.name ?? it.school_id}
                  </Link>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-full border px-3 py-1 text-xs"
                      disabled={saving}
                      onClick={() => promoteToNextRank(it)}
                    >
                      {t(language, "shortlist.rank_next")}
                    </button>
                    <button
                      className="text-xs text-muted-foreground underline"
                      onClick={() => removeSchool(it.school_id)}
                      disabled={saving}
                    >
                      {t(language, "shortlist.remove")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </InfoCard>
        ) : null}

        <p className="text-xs text-muted-foreground">{t(language, "shortlist.footer")}</p>
      </div>
    </main>
  );
}
