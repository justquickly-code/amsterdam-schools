"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { supabase } from "@/lib/supabaseClient";
import { Calendar, Heart, LogIn, Search, User } from "lucide-react";

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
        { href: "/", label: t(language, "nav.explore"), icon: Search },
        { href: "/shortlist", label: t(language, "nav.my_list"), icon: Heart, iconSize: "h-7 w-7" },
        { href: "/planner", label: t(language, "nav.open_days"), icon: Calendar },
        { href: "/profile", label: t(language, "nav.profile"), icon: User },
      ]
    : [
        { href: "/", label: t(language, "nav.explore"), icon: Search },
        { href: "/shortlist", label: t(language, "nav.my_list"), icon: Heart, iconSize: "h-7 w-7" },
        { href: "/login", label: t(language, "nav.login"), icon: LogIn },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur md:hidden">
      <div className="mx-auto max-w-3xl px-4 pb-[env(safe-area-inset-bottom)] pt-2">
        <div className={`grid gap-2 text-center text-[11px] ${items.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            const iconClass = item.iconSize ?? "h-6 w-6";
            const wrapperClass = item.iconSize ?? "h-6 w-6";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-14 flex-col items-center justify-center gap-1 px-2 py-2 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`flex items-center justify-center ${wrapperClass}`}>
                  <Icon className={`${iconClass} block`} />
                </span>
                <span className={`text-[11px] font-medium leading-none ${active ? "text-primary" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
