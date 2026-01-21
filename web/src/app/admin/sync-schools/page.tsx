"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { InfoCard, Wordmark } from "@/components/schoolkeuze";

type Json = Record<string, unknown> | unknown[] | null;

export default function AdminSyncSchoolsPage() {
  const [token, setToken] = useState<string>("");
  const [schoolYearLabel, setSchoolYearLabel] = useState("2025/26");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Json>(null);
  const [error, setError] = useState<string>("");
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("admin_sync_token");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(saved ?? "");
  }, []);

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
        const json = await res.json().catch(() => null);
        if (res.status === 401 && json?.error?.includes("Unauthorized")) {
          // Allow viewing page; token gate happens on action.
          return;
        }
        setForbidden(true);
      }
    })().catch(() => null);
  }, [token]);

  async function runSync() {
    setRunning(true);
    setError("");
    setResult(null);

    const { data: sess } = await supabase.auth.getSession();
    const accessToken = sess.session?.access_token ?? "";
    if (!accessToken) {
      setError("Not signed in.");
      setRunning(false);
      return;
    }

    window.sessionStorage.setItem("admin_sync_token", token);

    try {
      const res = await fetch("/api/admin/sync-schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-admin-token": token,
        },
        body: JSON.stringify({ schoolYearLabel }),
      });
      const json = await res.json();
      setResult(json);
      if (!res.ok) setError(json?.error ?? "Sync failed");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      setError(msg);
    }

    setRunning(false);
  }

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
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-col gap-2">
          <Wordmark />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-semibold text-foreground">Sync schools</h1>
            <div className="flex gap-3 text-sm">
              <Link className="font-semibold text-primary hover:underline" href="/admin">
                Back to Admin
              </Link>
              <Link className="font-semibold text-muted-foreground hover:underline" href="/">
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        <InfoCard title="What this does">
          <p className="text-sm text-muted-foreground">
            This fetches Amsterdam secondary school locations from Schoolwijzer (OpenData API) and upserts into
            our <code>schools</code> table.
          </p>
        </InfoCard>

        <InfoCard title="Run sync">
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <div className="text-sm font-medium">School year label</div>
                <input
                  className="w-full rounded-2xl border bg-background px-4 py-2"
                  value={schoolYearLabel}
                  onChange={(e) => setSchoolYearLabel(e.target.value)}
                  placeholder="2025/26"
                />
              </label>

              <label className="space-y-1">
                <div className="text-sm font-medium">Admin token</div>
                <input
                  className="w-full rounded-2xl border bg-background px-4 py-2"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="(from ADMIN_SYNC_TOKEN)"
                />
              </label>
            </div>

            <button
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
              onClick={runSync}
              disabled={running || !token.trim() || !schoolYearLabel.trim()}
            >
              {running ? "Syncing..." : "Sync schools now"}
            </button>

            {error && <p className="text-sm text-red-600">Error: {error}</p>}
          </div>
        </InfoCard>

        {result && (
          <InfoCard title="Result">
            <pre className="text-xs rounded-md border p-3 overflow-auto bg-background">
              {JSON.stringify(result, null, 2)}
            </pre>
          </InfoCard>
        )}
      </div>
    </main>
  );
}
