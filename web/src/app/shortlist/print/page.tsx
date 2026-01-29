"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { shortlistRankCapForLevels } from "@/lib/levels";
import { InfoCard, Wordmark } from "@/components/schoolkeuze";
import { Bike, Star } from "lucide-react";

type WorkspaceRow = { id: string; advies_levels?: string[] };

type ShortlistRow = { id: string; workspace_id: string };

type ShortlistItemRowRaw = {
  school_id: string;
  rank: number | null;
  school?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
};

type ShortlistItem = {
  school_id: string;
  rank: number;
  school_name: string;
};

type VisitRow = {
  school_id: string;
  attended: boolean | null;
  notes: string | null;
  pros: string | null;
  cons: string | null;
  rating_stars: number | null;
};

type CommuteCacheRow = {
  school_id: string;
  duration_minutes: number | null;
  distance_km: number | null;
};

export default function ShortlistPrintPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [visits, setVisits] = useState<Map<string, VisitRow>>(new Map());
  const [commutes, setCommutes] = useState<Map<string, CommuteCacheRow>>(new Map());
  const [adviesLevels, setAdviesLevels] = useState<string[]>([]);

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

      const { workspace: ws, error: wErr } = await fetchCurrentWorkspace<WorkspaceRow>("id,advies_levels");

      if (!mounted) return;

      const workspaceRow = (ws ?? null) as WorkspaceRow | null;
      if (wErr || !workspaceRow) {
        setError(wErr ?? "No workspace found.");
        setLoading(false);
        return;
      }
      setAdviesLevels(workspaceRow.advies_levels ?? []);

      const { data: shortlist, error: sErr } = await supabase
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

      const shortlistRow = (shortlist ?? null) as ShortlistRow | null;
      if (!shortlistRow?.id) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data: rows, error: iErr } = await supabase
        .from("shortlist_items")
        .select("school_id,rank,school:schools(id,name)")
        .eq("shortlist_id", shortlistRow.id)
        .order("rank", { ascending: true });

      if (!mounted) return;

      if (iErr) {
        setError(iErr.message);
        setLoading(false);
        return;
      }

      const normalized = (rows ?? [])
        .filter((row) => (row as ShortlistItemRowRaw).rank != null)
        .map((row) => {
        const r = row as ShortlistItemRowRaw;
        const school = Array.isArray(r.school) ? r.school[0] ?? null : r.school ?? null;
        return {
          school_id: r.school_id,
          rank: r.rank as number,
          school_name: school?.name ?? r.school_id,
        } as ShortlistItem;
      });

      setItems(normalized);

      const schoolIds = normalized.map((x) => x.school_id).filter(Boolean);
      if (schoolIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: visitRows, error: vErr } = await supabase
        .from("visits")
        .select("school_id,attended,notes,pros,cons,rating_stars")
        .eq("workspace_id", workspaceRow.id)
        .in("school_id", schoolIds);

      if (!mounted) return;

      if (vErr) {
        setError(vErr.message);
        setLoading(false);
        return;
      }

      const vMap = new Map<string, VisitRow>();
      for (const v of (visitRows ?? []) as VisitRow[]) {
        vMap.set(v.school_id, v);
      }
      setVisits(vMap);

      const { data: commuteRows, error: cErr } = await supabase
        .from("commute_cache")
        .select("school_id,duration_minutes,distance_km")
        .eq("workspace_id", workspaceRow.id)
        .eq("mode", "bike")
        .in("school_id", schoolIds);

      if (!mounted) return;

      if (cErr) {
        setError(cErr.message);
        setLoading(false);
        return;
      }

      const cMap = new Map<string, CommuteCacheRow>();
      for (const c of (commuteRows ?? []) as CommuteCacheRow[]) {
        cMap.set(c.school_id, c);
      }
      setCommutes(cMap);

      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const rankCap = useMemo(() => shortlistRankCapForLevels(adviesLevels), [adviesLevels]);
  const ordered = useMemo(
    () => items.filter((item) => item.rank <= rankCap).slice().sort((a, b) => a.rank - b.rank),
    [items, rankCap]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto w-full max-w-4xl space-y-6 print:max-w-none print:space-y-4">
        <header className="flex flex-col gap-2 print:pb-2">
          <Wordmark className="print:hidden" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:flex-row">
            <div>
              <h1 className="text-3xl font-semibold text-foreground print:text-black">Ranked list — Print</h1>
              <div className="text-sm text-muted-foreground print:text-black">
                Ranked shortlist with notes and ratings (cap {rankCap}).
              </div>
            </div>
            <div className="flex gap-3 print:hidden">
              <button className="text-sm font-semibold text-primary hover:underline" onClick={() => window.print()}>
                Print
              </button>
              <Link className="text-sm font-semibold text-muted-foreground hover:underline" href="/shortlist">
                Back
              </Link>
            </div>
          </div>
        </header>

        {error && <p className="text-sm text-red-600">Error: {error}</p>}

        {!error && ordered.length === 0 && (
          <InfoCard title="No ranked schools">
            <p className="text-sm text-muted-foreground">No ranked schools yet.</p>
          </InfoCard>
        )}

        <div className="space-y-3 print:space-y-2">
          {ordered.map((item) => {
            const visit = visits.get(item.school_id) ?? null;
            const commute = commutes.get(item.school_id) ?? null;
            return (
              <InfoCard key={item.school_id} title={`#${item.rank} — ${item.school_name}`} className="print:shadow-none">
                <div className="space-y-2 text-sm">
                  <div className="text-sm text-muted-foreground print:text-black">
                    {visit?.rating_stars ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {visit.rating_stars}/5
                      </span>
                    ) : (
                      "No rating"
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground print:text-black">
                    Attended: {visit?.attended ? "Yes" : "No"}
                    {commute?.duration_minutes != null && commute?.distance_km != null ? (
                      <span className="inline-flex items-center gap-2">
                        <Bike className="h-4 w-4" />
                        {commute.duration_minutes} min • {commute.distance_km} km
                      </span>
                    ) : null}
                  </div>

                  {visit?.notes ? (
                    <div className="text-sm">Notes: {visit.notes}</div>
                  ) : null}

                  {(visit?.pros || visit?.cons) && (
                    <div className="text-sm">
                      {visit?.pros ? <div>Pros: {visit.pros}</div> : null}
                      {visit?.cons ? <div>Cons: {visit.cons}</div> : null}
                    </div>
                  )}
                </div>
              </InfoCard>
            );
          })}
        </div>
      </div>
    </main>
  );
}
