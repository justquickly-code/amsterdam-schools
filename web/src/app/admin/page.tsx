"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Wordmark } from "@/components/schoolkeuze";

export default function AdminHomePage() {
  const [forbidden, setForbidden] = useState(false);
  const [hasNewFeedback, setHasNewFeedback] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token ?? "";
      if (!accessToken) {
        setForbidden(true);
        return;
      }

      const res = await fetch("/api/admin/check", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        setForbidden(true);
        return;
      }

      const listRes = await fetch("/api/admin/feedback", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (listRes.ok) {
        const json = await listRes.json().catch(() => null);
        const latest = (json?.items ?? [])[0];
        const latestTs = latest?.created_at ? new Date(latest.created_at).getTime() : 0;
        const lastSeen =
          typeof window !== "undefined"
            ? new Date(window.localStorage.getItem("admin_feedback_last_seen") ?? 0).getTime()
            : 0;
        setHasNewFeedback(latestTs > lastSeen);
      }
    })().catch(() => setForbidden(true));
  }, []);

  if (forbidden) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center">
          <p className="text-sm text-red-600">Forbidden: admin access required.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col gap-2">
          <Wordmark />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-semibold text-foreground">Admin</h1>
            <Link className="text-sm font-semibold text-primary hover:underline" href="/">
              Dashboard
            </Link>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link className="rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md" href="/admin/sync-schools">
            <div className="font-semibold text-foreground">Sync schools</div>
            <div className="text-sm text-muted-foreground">Fetch school list + locations.</div>
          </Link>
          <Link className="rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md" href="/admin/sync-open-days">
            <div className="font-semibold text-foreground">Sync open days</div>
            <div className="text-sm text-muted-foreground">Import open day listings.</div>
          </Link>
          <Link className="rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md" href="/admin/compute-commutes">
            <div className="font-semibold text-foreground">Compute commutes</div>
            <div className="text-sm text-muted-foreground">Batch bike time + distance cache.</div>
          </Link>
          <Link className="rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md" href="/admin/feedback">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-foreground">Feedback</div>
              {hasNewFeedback && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
            </div>
            <div className="text-sm text-muted-foreground">Review and respond to user feedback.</div>
          </Link>
        </div>
      </div>
    </main>
  );
}
