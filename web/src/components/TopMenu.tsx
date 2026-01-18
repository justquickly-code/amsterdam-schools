"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function TopMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="fixed right-6 top-6 z-50" ref={menuRef}>
      <div className="relative">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl border text-sm"
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
        >
          ☰
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 rounded-md border bg-white p-2 shadow-md">
            {email ? (
              <div className="px-2 py-1 text-xs text-muted-foreground">{email}</div>
            ) : null}
            <Link
              className="block rounded px-2 py-2 text-sm hover:bg-muted/40"
              href="/settings"
              onClick={() => setOpen(false)}
            >
              Settings
            </Link>
            <Link
              className="block rounded px-2 py-2 text-sm hover:bg-muted/40"
              href="/shortlist/print"
              target="_blank"
              onClick={() => setOpen(false)}
            >
              Print / Export
            </Link>
            <button
              className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-muted/40"
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
