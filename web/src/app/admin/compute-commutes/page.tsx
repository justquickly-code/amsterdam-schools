"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Json = Record<string, unknown> | unknown[] | null;

export default function AdminComputeCommutesPage() {
  const [token, setToken] = useState<string>("");
  const [limit, setLimit] = useState(200);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Json>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const saved = window.localStorage.getItem("admin_sync_token");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(saved ?? "");
  }, []);

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

    window.localStorage.setItem("admin_sync_token", token);

    try {
      const res = await fetch("/api/admin/compute-commutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-admin-token": token,
        },
        body: JSON.stringify({ limit }),
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

  return (
    <main className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-2xl rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin: Compute commutes</h1>
          <div className="flex gap-3">
            <Link className="text-sm underline" href="/schools">
              Schools
            </Link>
            <Link className="text-sm underline" href="/">
              Home
            </Link>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Computes bike time + distance from your workspace home address to a batch of schools and caches results.
          Make sure Settings has postcode + house number set.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <div className="text-sm font-medium">Admin token</div>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="(ADMIN_SYNC_TOKEN)"
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Batch size</div>
            <input
              className="w-full rounded-md border px-3 py-2"
              type="number"
              min={1}
              max={200}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </label>
        </div>

        <button
          className="rounded-md border px-3 py-2"
          onClick={runCompute}
          disabled={running || !token.trim()}
        >
          {running ? "Computing..." : "Compute commutes now"}
        </button>

        {error && <p className="text-sm text-red-600">Error: {error}</p>}

        {result && (
          <pre className="text-xs rounded-md border p-3 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}