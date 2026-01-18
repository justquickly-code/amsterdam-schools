"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Workspace = { id: string };

type WorkspaceRow = { id: string };

type ShortlistRow = { id: string; workspace_id: string };

type ShortlistItemRow = { school_id: string; rank: number; school?: { id: string; name: string } | null };

type ShortlistItemRowRaw = {
  school_id: string;
  rank: number;
  school?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
};

type ShortlistItem = {
  school_id: string;
  rank: number;
  school?: { id: string; name: string } | null;
};

export default function ShortlistPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [, setWorkspace] = useState<Workspace | null>(null);
  const [shortlistId, setShortlistId] = useState<string | null>(null);
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

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
      setWorkspace(workspaceRow);

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
      setItems(normalized);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const rankMap = useMemo(() => {
    const m = new Map<number, ShortlistItem>();
    for (const it of items) m.set(it.rank, it);
    return m;
  }, [items]);

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
      setSavedMsg("Saved.");
    }

    setSaving(false);
  }

  async function move(fromRank: number, toRank: number) {
    if (!shortlistId) return;
    if (fromRank === toRank) return;

    const a = rankMap.get(fromRank);
    const b = rankMap.get(toRank);
    if (!a) return;

    setSaving(true);
    setError("");
    setSavedMsg("");

    // If target occupied, swap ranks via 2 updates.
    // (Simple + safe; 12 items max.)
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
        prev
          .map((x) =>
            x.school_id === a.school_id
              ? { ...x, rank: toRank }
              : x.school_id === b.school_id
              ? { ...x, rank: fromRank }
              : x
          )
          .sort((x, y) => x.rank - y.rank)
      );
    
      setSavedMsg("Saved.");
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
            prev.map((x) => (x.rank === fromRank ? { ...x, rank: toRank } : x)).sort((x, y) => x.rank - y.rank)
          );
          setSavedMsg("Saved.");
        }
      } else {
        setError(error.message);
      }
    }
    else {
      setItems((prev) =>
        prev.map((x) => (x.rank === fromRank ? { ...x, rank: toRank } : x)).sort((x, y) => x.rank - y.rank)
      );
      setSavedMsg("Saved.");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-3xl rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Top 12 Shortlist</h1>
        </div>

        {error && <p className="text-sm text-red-600">Error: {error}</p>}
        {savedMsg && <p className="text-sm text-green-700">{savedMsg}</p>}

        <div className="text-sm text-muted-foreground">
          Exactly these 12 (ranked) are what you’ll submit.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 12 }).map((_, i) => {
            const rank = i + 1;
            const it = rankMap.get(rank);
            return (
              <div key={rank} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">#{rank}</div>
                  {it && (
                    <button
                      className="text-xs underline"
                      onClick={() => removeRank(rank)}
                      disabled={saving}
                    >
                      remove
                    </button>
                  )}
                </div>

                <div className="min-h-10">
                  {it ? (
                    <div>{it.school?.name ?? it.school_id}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Empty</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    className="rounded-md border px-2 py-1 text-xs"
                    disabled={saving || !it || rank === 1}
                    onClick={() => move(rank, rank - 1)}
                  >
                    ↑
                  </button>
                  <button
                    className="rounded-md border px-2 py-1 text-xs"
                    disabled={saving || !it || rank === 12}
                    onClick={() => move(rank, rank + 1)}
                  >
                    ↓
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Next: add “Add to shortlist” from the Schools list / School detail page.
        </p>
      </div>
    </main>
  );
}
