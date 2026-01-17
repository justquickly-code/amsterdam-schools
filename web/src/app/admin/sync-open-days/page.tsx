"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function AdminSyncOpenDaysPage() {
  const [token, setToken] = useState("");
  const [schoolYear, setSchoolYear] = useState("2025/26");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const saved = window.localStorage.getItem("admin_sync_token");
    if (saved) setToken(saved);
  }, []);

  async function runSync() {
    setRunning(true);
    setError("");
    setResult(null);

    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setError("Not signed in.");
      setRunning(false);
      return;
    }

    window.localStorage.setItem("admin_sync_token", token);

    try {
      const res = await fetch("/api/admin/sync-open-days", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ school_year_label: schoolYear }),
      });

      const json = await res.json();
      setResult(json);
      if (!res.ok) setError(json?.error ?? "Sync failed");
    } catch (e: any) {
      setError(e?.message ?? "Sync failed");
    }

    setRunning(false);
  }

  return (
    <main className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-2xl rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin: Sync open days</h1>
          <div className="flex gap-3">
            <Link className="text-sm underline" href="/open-days">
              Open days
            </Link>
            <Link className="text-sm underline" href="/">
              Home
            </Link>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Imports open day listings and stores them as an annual snapshot.
          Always verify details on the school website.
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
            <div className="text-sm font-medium">School year</div>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              placeholder="2025/26"
            />
          </label>
        </div>

        <button
          className="rounded-md border px-3 py-2"
          onClick={runSync}
          disabled={running || !token.trim()}
        >
          {running ? "Syncing..." : "Sync open days now"}
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