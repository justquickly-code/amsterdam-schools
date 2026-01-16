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
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-6 space-y-4">
        <h1 className="text-2xl font-semibold">You’re signed in</h1>
        <p className="text-sm">Signed in as: {email}</p>

        <div className="flex gap-3">
          <Link className="rounded-md border px-3 py-2" href="/schools">
            Schools (coming next)
          </Link>
          <button className="rounded-md border px-3 py-2" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}