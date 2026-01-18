"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function AdminHomePage() {
  const [forbidden, setForbidden] = useState(false);

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
      if (!res.ok) setForbidden(true);
    })().catch(() => setForbidden(true));
  }, []);

  if (forbidden) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-red-600">Forbidden: admin access required.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-3xl rounded-xl border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <Link className="text-sm underline" href="/">
            Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link className="rounded-lg border p-4 hover:bg-muted/30" href="/admin/sync-schools">
            <div className="font-medium">Sync schools</div>
            <div className="text-sm text-muted-foreground">Fetch school list + locations.</div>
          </Link>
          <Link className="rounded-lg border p-4 hover:bg-muted/30" href="/admin/sync-open-days">
            <div className="font-medium">Sync open days</div>
            <div className="text-sm text-muted-foreground">Import open day listings.</div>
          </Link>
          <Link className="rounded-lg border p-4 hover:bg-muted/30" href="/admin/compute-commutes">
            <div className="font-medium">Compute commutes</div>
            <div className="text-sm text-muted-foreground">Batch bike time + distance cache.</div>
          </Link>
        </div>
      </div>
    </main>
  );
}
