"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { InfoCard, Wordmark } from "@/components/schoolkeuze";

type Json = Record<string, unknown> | unknown[] | null;

export default function AdminComputeCommutesPage() {
  const [token, setToken] = useState<string>("");
  const [limit, setLimit] = useState(200);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Json>(null);
  const [error, setError] = useState<string>("");
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("admin_sync_token");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(saved ?? "");

    (async () => {
      const { workspace, error: wErr } = await fetchCurrentWorkspace<{ id: string }>("id");
      if (wErr) {
        setError(wErr);
        return;
      }
      setWorkspaceId((workspace?.id ?? "") as string);
    })();
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

  async function runCompute() {
    setRunning(true);
    setError("");
    setResult(null);

    const { data: sess } = await supabase.auth.getSession();
    const accessToken = sess.session?.access_token ?? "";
    if (!accessToken) {
      setError("You must be logged in");
      setRunning(false);
      return;
    }
    if (!workspaceId.trim()) {
      setError("No workspace found.");
      setRunning(false);
      return;
    }

    window.sessionStorage.setItem("admin_sync_token", token);

    try {
      const res = await fetch("/api/admin/compute-commutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-admin-token": token,
        },
        body: JSON.stringify({ limit, workspace_id: workspaceId }),
      });
      const json = await res.json();
      setResult(json);
      if (!res.ok) setError(json?.error ?? "Compute failed");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Compute failed";
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
            <h1 className="text-3xl font-serif font-semibold text-foreground">Compute commutes</h1>
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
            Computes bike time + distance from your workspace home address to a batch of schools and caches results.
            Make sure Settings has postcode + house number set.
          </p>
        </InfoCard>

        <InfoCard title="Run compute">
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <div className="text-sm font-medium">Admin token</div>
                <input
                  className="w-full rounded-2xl border bg-background px-4 py-2"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="(ADMIN_SYNC_TOKEN)"
                />
              </label>

              <label className="space-y-1">
                <div className="text-sm font-medium">Workspace ID</div>
                <input
                  className="w-full rounded-2xl border bg-background px-4 py-2"
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  placeholder="(auto-filled from session)"
                />
              </label>

              <label className="space-y-1">
                <div className="text-sm font-medium">Batch size</div>
                <input
                  className="w-full rounded-2xl border bg-background px-4 py-2"
                  type="number"
                  min={1}
                  max={200}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                />
              </label>
            </div>

            <button
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
              onClick={runCompute}
              disabled={running || !token.trim()}
            >
              {running ? "Computing..." : "Compute commutes now"}
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
