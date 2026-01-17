"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

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

  async function signOut() {
    await supabase.auth.signOut();
  }

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
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Amsterdam Schools</h1>
          <p className="text-sm text-muted-foreground">Signed in as: {email}</p>
        </div>

        {/* Primary actions */}
        <div className="grid grid-cols-1 gap-3">
          <Link className="rounded-md border px-3 py-2" href="/schools">
            Schools
          </Link>

          <Link className="rounded-md border px-3 py-2" href="/planner">
            Open days
          </Link>

          <Link className="rounded-md border px-3 py-2" href="/shortlist">
            Top 12 shortlist
          </Link>

          <Link className="rounded-md border px-3 py-2" href="/settings">
            Settings
          </Link>
        </div>

        {/* Secondary */}
        <div className="flex items-center justify-between pt-2 border-t">
          <button className="text-sm underline" onClick={signOut}>
            Sign out
          </button>
          <div className="text-xs text-muted-foreground">
            Tip: Open day details can change — always verify on the school website.
          </div>
        </div>
      </div>
    </main>
  );
}
