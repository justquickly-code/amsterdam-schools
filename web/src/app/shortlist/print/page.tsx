"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type WorkspaceRow = { id: string };

type ShortlistRow = { id: string; workspace_id: string };

type ShortlistItemRowRaw = {
  school_id: string;
  rank: number;
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

      const { data: ws, error: wErr } = await supabase
        .from("workspaces")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (!mounted) return;

      const workspaceRow = (ws ?? null) as WorkspaceRow | null;
      if (wErr || !workspaceRow) {
        setError(wErr?.message ?? "No workspace found.");
        setLoading(false);
        return;
      }

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

      const normalized = (rows ?? []).map((row) => {
        const r = row as ShortlistItemRowRaw;
        const school = Array.isArray(r.school) ? r.school[0] ?? null : r.school ?? null;
        return {
          school_id: r.school_id,
          rank: r.rank,
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

  const ordered = useMemo(() => items.slice().sort((a, b) => a.rank - b.rank), [items]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Top 12 — Print</h1>
            <div className="text-sm text-muted-foreground">Ranked shortlist with notes and ratings.</div>
          </div>
          <div className="flex gap-3">
            <button className="text-sm underline" onClick={() => window.print()}>
              Print
            </button>
            <Link className="text-sm underline" href="/shortlist">
              Back
            </Link>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">Error: {error}</p>}

        {!error && ordered.length === 0 && (
          <p className="text-sm text-muted-foreground">No schools in your Top 12 yet.</p>
        )}

        <div className="space-y-3">
          {ordered.map((item) => {
            const visit = visits.get(item.school_id) ?? null;
            const commute = commutes.get(item.school_id) ?? null;
            return (
              <div key={item.school_id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    #{item.rank} — {item.school_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {visit?.rating_stars ? `${visit.rating_stars}★` : "No rating"}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground mt-1">
                  Attended: {visit?.attended ? "Yes" : "No"}
                  {commute?.duration_minutes != null && commute?.distance_km != null ? (
                    <> • 🚲 {commute.duration_minutes} min • {commute.distance_km} km</>
                  ) : null}
                </div>

                {visit?.notes ? (
                  <div className="text-sm mt-2">Notes: {visit.notes}</div>
                ) : null}

                {(visit?.pros || visit?.cons) && (
                  <div className="text-sm mt-2">
                    {visit?.pros ? <div>Pros: {visit.pros}</div> : null}
                    {visit?.cons ? <div>Cons: {visit.cons}</div> : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
