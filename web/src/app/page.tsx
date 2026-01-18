"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type WorkspaceRow = {
  id: string;
  child_name: string | null;
  home_postcode: string | null;
  home_house_number: string | null;
  advies_levels: string[];
};

type OpenDayRow = {
  id: string;
  starts_at: string | null;
  school_name: string | null;
  school?: Array<{ name: string | null } | null> | null;
};
type ShortlistRow = { id: string; workspace_id: string };
type ShortlistItemRow = { school_id: string };

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null);
  const [upcoming, setUpcoming] = useState<OpenDayRow[]>([]);
  const [shortlistIds, setShortlistIds] = useState<string[]>([]);
  const [dashError, setDashError] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.session?.user?.email ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      if (!email) return;

      const { data: ws, error: wErr } = await supabase
        .from("workspaces")
        .select("id,child_name,home_postcode,home_house_number,advies_levels")
        .limit(1)
        .maybeSingle();

      if (!mounted) return;

      if (wErr) {
        setDashError(wErr.message);
        return;
      }

      const wsRow = (ws ?? null) as WorkspaceRow | null;
      setWorkspace(wsRow);

      const now = new Date();
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Shortlist ids (optional filter)
      const { data: shortlist, error: sErr } = await supabase
        .from("shortlists")
        .select("id,workspace_id")
        .eq("workspace_id", wsRow?.id ?? "")
        .maybeSingle();

      if (!mounted) return;

      if (sErr && sErr.code !== "PGRST116") {
        setDashError(sErr.message);
        return;
      }

      const shortlistRow = (shortlist ?? null) as ShortlistRow | null;
      let shortlistSchoolIds: string[] = [];
      if (shortlistRow?.id) {
        const { data: items, error: iErr } = await supabase
          .from("shortlist_items")
          .select("school_id")
          .eq("shortlist_id", shortlistRow.id);

        if (!mounted) return;

        if (iErr) {
          setDashError(iErr.message);
          return;
        }

        shortlistSchoolIds = ((items ?? []) as ShortlistItemRow[])
          .map((x) => x.school_id)
          .filter(Boolean);
      }
      setShortlistIds(shortlistSchoolIds);

      let query = supabase
        .from("open_days")
        .select("id,starts_at,school_name,school:schools(name),school_id")
        .eq("is_active", true)
        .gte("starts_at", now.toISOString())
        .lte("starts_at", end.toISOString())
        .order("starts_at", { ascending: true })
        .limit(5);

      if (shortlistSchoolIds.length) {
        query = query.in("school_id", shortlistSchoolIds);
      }

      const { data: rows, error: oErr } = await query;

      if (!mounted) return;

      if (oErr) {
        setDashError(oErr.message);
        return;
      }

      setUpcoming((rows ?? []) as OpenDayRow[]);
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [email]);

  const setupNeeded = useMemo(() => {
    if (!workspace) return false;
    const hasChild = Boolean((workspace.child_name ?? "").trim());
    const hasAddress = Boolean(workspace.home_postcode && workspace.home_house_number);
    const hasAdvies = (workspace.advies_levels ?? []).length > 0;
    return !hasChild || !hasAddress || !hasAdvies;
  }, [workspace]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm">Loading…</p>
      </main>
    );
  }

  if (!email) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Amsterdam Schools</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with a parent email. The app stays signed in on this device.
          </p>
          <Link className="inline-block rounded-md border px-3 py-2" href="/login">
            Go to sign in
          </Link>

          <div className="pt-2 text-xs text-muted-foreground">
            Tip: once signed in, you’ll be able to browse schools, save visit notes, build a ranked Top 12,
            and see open days.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-3xl rounded-xl border p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          {workspace?.child_name ? (
            <p className="text-sm text-muted-foreground">Welcome, {workspace.child_name}</p>
          ) : null}
        </div>

        {dashError && <p className="text-sm text-red-600">Error: {dashError}</p>}

        {setupNeeded && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="font-medium">Finish setup</div>
            <div className="text-sm text-muted-foreground">
              Add the child’s name, home address, and advies level to personalize school filters and commute
              times.
            </div>
            <Link className="inline-block rounded-md border px-3 py-2 text-sm" href="/settings">
              Go to Settings
            </Link>
          </div>
        )}

        <div className="rounded-lg border p-4 space-y-2">
          <div className="font-medium">
            Upcoming open days (next 30 days)
            {shortlistIds.length ? " • Shortlist" : ""}
          </div>
          {upcoming.length === 0 ? (
            <div className="text-sm text-muted-foreground">No upcoming open days found.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcoming.map((r) => {
                const name = r.school?.[0]?.name ?? r.school_name ?? "School";
                const date = r.starts_at ? new Date(r.starts_at).toLocaleDateString("nl-NL") : "—";
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{name}</span>
                    <span className="text-muted-foreground">{date}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="pt-2">
            <Link className="text-sm underline" href="/planner">
              View all open days
            </Link>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="font-medium">Shortlist</div>
          <div className="text-sm text-muted-foreground">
            Keep your ranked Top 12 up to date as you visit schools.
          </div>
          <Link className="inline-block rounded-md border px-3 py-2 text-sm" href="/shortlist">
            Open Top 12
          </Link>
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          Tip: Open day details can change — always verify on the school website.
        </div>
      </div>
    </main>
  );
}
