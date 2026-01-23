"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { supabase } from "@/lib/supabaseClient";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function BottomNav() {
  const pathname = usePathname();
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      const { workspace } = await fetchCurrentWorkspace<{ language?: Language | null }>("language");
      setLanguage((workspace?.language as Language) ?? readStoredLanguage());
    })().catch(() => null);

    function onLang(e: Event) {
      const next = (e as CustomEvent<Language>).detail;
      if (next) setLanguage(next);
    }
    window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthed(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(Boolean(session));
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const items = isAuthed
    ? [
        { href: "/", label: t(language, "nav.explore") },
        { href: "/schools", label: t(language, "nav.schools") },
        { href: "/planner", label: t(language, "nav.open_days") },
        { href: "/shortlist", label: t(language, "nav.my_list") },
        { href: "/profile", label: t(language, "nav.profile") },
      ]
    : [
        { href: "/", label: t(language, "nav.explore") },
        { href: "/schools", label: t(language, "nav.schools") },
        { href: "/login", label: t(language, "nav.login") },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className={`grid gap-2 text-center text-xs ${items.length === 5 ? "grid-cols-5" : "grid-cols-3"}`}>
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-2 transition-colors ${active ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
