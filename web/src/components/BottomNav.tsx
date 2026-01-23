"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { supabase } from "@/lib/supabaseClient";

type NavIconProps = { className?: string };

function SearchIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 21l-4.35-4.35"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 20s-7-4.35-7-10.2a4.4 4.4 0 0 1 7-3.4 4.4 4.4 0 0 1 7 3.4C19 15.65 12 20 12 20Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 3v4M16 3v4M3 10h18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ListIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="3" cy="7" r="1" fill="currentColor" />
      <circle cx="3" cy="12" r="1" fill="currentColor" />
      <circle cx="3" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

function LoginIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 12h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 8l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
        { href: "/", label: t(language, "nav.explore"), icon: SearchIcon },
        { href: "/shortlist", label: t(language, "nav.my_list"), icon: HeartIcon, iconSize: "h-7 w-7" },
        { href: "/planner", label: t(language, "nav.open_days"), icon: CalendarIcon },
        { href: "/schools", label: t(language, "nav.schools"), icon: ListIcon },
        { href: "/profile", label: t(language, "nav.profile"), icon: UserIcon },
      ]
    : [
        { href: "/", label: t(language, "nav.explore"), icon: SearchIcon },
        { href: "/shortlist", label: t(language, "nav.my_list"), icon: HeartIcon, iconSize: "h-7 w-7" },
        { href: "/login", label: t(language, "nav.login"), icon: LoginIcon },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur md:hidden">
      <div className="mx-auto max-w-3xl px-4 pb-[env(safe-area-inset-bottom)] pt-2">
        <div className={`grid gap-2 text-center text-[11px] ${items.length === 5 ? "grid-cols-5" : "grid-cols-3"}`}>
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            const iconClass = item.iconSize ?? "h-6 w-6";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-14 flex-col items-center justify-center gap-1 px-2 py-2 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center">
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
