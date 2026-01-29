"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Wordmark } from "@/components/schoolkeuze";

type StatRow = {
  date: string;
  new: number;
  cumulative: number;
};

export default function AdminUserStatsPage() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<StatRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token ?? "";
      if (!accessToken) {
        setForbidden(true);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/user-stats", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        setForbidden(res.status === 401 || res.status === 403);
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Failed to load user stats.");
        setLoading(false);
        return;
      }

      const json = await res.json();
      setRows(json?.rows ?? []);
      setTotal(json?.total ?? null);
      setLoading(false);
    })().catch((err) => {
      setError(err?.message ?? "Failed to load user stats.");
      setLoading(false);
    });
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
            <h1 className="text-3xl font-serif font-semibold text-foreground">User stats</h1>
            <Link className="text-sm font-semibold text-primary hover:underline" href="/admin">
              Back to admin
            </Link>
          </div>
        </header>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && error && <p className="text-sm text-red-600">Error: {error}</p>}

        {!loading && !error && (
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
              <div className="text-sm text-muted-foreground">
                Rolling 7 days · UTC
              </div>
              {total != null && (
                <div className="text-sm font-semibold text-foreground">
                  Total users: {total}
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2">Date (UTC)</th>
                    <th className="py-2">New users</th>
                    <th className="py-2">Cumulative users</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.date} className="border-t">
                      <td className="py-2 font-medium text-foreground">{row.date}</td>
                      <td className="py-2">{row.new}</td>
                      <td className="py-2">{row.cumulative}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
