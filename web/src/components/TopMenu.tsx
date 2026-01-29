"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Language, LANGUAGE_EVENT, emitLanguageChanged, readStoredLanguage, setStoredLanguage, t } from "@/lib/i18n";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { Wordmark } from "@/components/schoolkeuze";
import { Menu } from "lucide-react";

export default function TopMenu({ initialLanguage }: { initialLanguage?: Language }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [language, setLanguage] = useState<Language>(() => initialLanguage ?? readStoredLanguage());
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [hasNewFeedback, setHasNewFeedback] = useState(false);
  const adminFeedbackSeenEvent = "admin-feedback-seen";
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isAuthed = Boolean(email);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
      setIsAdmin(false);
    });

    (async () => {
      const { workspace } = await fetchCurrentWorkspace<{ id: string; language?: Language | null }>(
        "id,language"
      );
      setLanguage((workspace?.language as Language) ?? readStoredLanguage());
      setWorkspaceId(workspace?.id ?? "");
    })().catch(() => {
      setLanguage(readStoredLanguage());
    });

    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token ?? "";
      if (!accessToken) {
        setIsAdmin(false);
        return;
      }

      const res = await fetch("/api/admin/check", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        setIsAdmin(false);
        return;
      }
      const json = await res.json().catch(() => null);
      setIsAdmin(Boolean(json?.ok));
    })().catch(() => setIsAdmin(false));

    function onLang(e: Event) {
      const next = (e as CustomEvent<Language>).detail;
      if (next) setLanguage(next);
    }
    window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id ?? "";
      if (!userId) return;

      if (isAdmin) {
        const lastSeen =
          typeof window !== "undefined"
            ? new Date(window.localStorage.getItem("admin_feedback_last_seen") ?? 0).getTime()
            : 0;

        const res = await fetch("/api/admin/feedback", {
          headers: { Authorization: `Bearer ${session.session?.access_token ?? ""}` },
        });
        const json = await res.json().catch(() => null);
        const latest = (json?.items ?? [])[0];
        const latestTs = latest?.created_at ? new Date(latest.created_at).getTime() : 0;
        setHasNewFeedback(latestTs > lastSeen);
        return;
      }

      const { data: memberRow } = await supabase
        .from("workspace_members")
        .select("feedback_last_seen_at")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle();

      const lastSeen = memberRow?.feedback_last_seen_at
        ? new Date(memberRow.feedback_last_seen_at).getTime()
        : 0;

      const { data: latest } = await supabase
        .from("feedback")
        .select("admin_responded_at")
        .eq("user_id", userId)
        .not("admin_responded_at", "is", null)
        .order("admin_responded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const latestTs = latest?.admin_responded_at ? new Date(latest.admin_responded_at).getTime() : 0;
      setHasNewFeedback(latestTs > lastSeen);
    })().catch(() => null);
  }, [workspaceId, isAdmin]);

  useEffect(() => {
    function onAdminFeedbackSeen() {
      setHasNewFeedback(false);
    }
    window.addEventListener(adminFeedbackSeenEvent, onAdminFeedbackSeen);
    return () => window.removeEventListener(adminFeedbackSeenEvent, onAdminFeedbackSeen);
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

  async function updateLanguage(next: Language) {
    if (next === language) return;
    if (workspaceId) {
      const { error } = await supabase
        .from("workspaces")
        .update({ language: next })
        .eq("id", workspaceId);
      if (error) return;
    }
    setLanguage(next);
    if (typeof window !== "undefined") {
      setStoredLanguage(next);
    }
    emitLanguageChanged(next);
  }

  const navLinks = useMemo(() => {
    if (isAuthed) {
      return [
        { href: "/", label: t(language, "nav.explore") },
        { href: "/shortlist", label: t(language, "nav.my_list") },
        { href: "/planner", label: t(language, "nav.open_days") },
        { href: "/profile", label: t(language, "nav.profile") },
      ];
    }
    return [
      { href: "/", label: t(language, "nav.explore") },
      { href: "/how-it-works", label: t(language, "menu.how_it_works") },
      { href: "/login", label: t(language, "menu.login") },
    ];
  }, [isAuthed, language]);

  return (
    <>
      <div className="fixed inset-x-0 top-4 z-50 hidden md:flex px-6">
        <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between" ref={menuRef}>
          <div className={isHome ? "" : "rounded-full bg-black/60 px-3 py-1"}>
            <Wordmark variant="white" />
          </div>
          <div className="absolute left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-full border bg-white/95 px-4 py-2 text-sm font-semibold text-foreground shadow-md backdrop-blur">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-primary">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border bg-white/90 px-3 py-1 text-xs font-semibold text-foreground shadow-sm"
              type="button"
              onClick={() => updateLanguage(language === "nl" ? "en" : "nl")}
              aria-label="Toggle language"
            >
              {language === "nl" ? "NL" : "EN"}
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white/90 text-sm shadow-sm"
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
          {hasNewFeedback && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
          )}

          {open && (
            <div className="absolute right-0 top-full mt-3 w-56 max-h-[calc(100vh-6rem)] overflow-auto rounded-md border bg-white p-2 shadow-md">
              {email ? (
                <div className="px-2 py-1 text-xs text-muted-foreground">{email}</div>
              ) : null}
            {isAuthed ? (
              <Link
                className="block rounded px-2 py-2 text-sm hover:bg-muted/40"
                href="/profile"
                onClick={() => setOpen(false)}
              >
                {t(language, "menu.profile")}
              </Link>
            ) : (
              <Link
                className="block rounded px-2 py-2 text-sm hover:bg-muted/40"
                href="/login"
                onClick={() => setOpen(false)}
              >
                {t(language, "menu.login")}
              </Link>
            )}
            <Link
              className="block rounded px-2 py-2 text-sm hover:bg-muted/40"
              href="/about"
              onClick={() => setOpen(false)}
            >
              {t(language, "menu.about")}
            </Link>
            <Link
              className="block rounded px-2 py-2 text-sm hover:bg-muted/40"
              href="/how-it-works"
              onClick={() => setOpen(false)}
            >
              {t(language, "menu.how_it_works")}
            </Link>
            {isAuthed ? (
              <>
                <Link
                  className="block rounded px-2 py-2 text-sm hover:bg-muted/40"
                  href="/feedback"
                  onClick={() => setOpen(false)}
                >
                  <span className="flex items-center justify-between">
                    {t(language, "menu.feedback")}
                    {!isAdmin && hasNewFeedback && <span className="h-2 w-2 rounded-full bg-red-500" />}
                  </span>
                </Link>
                <Link
                  className="block rounded px-2 py-2 text-sm hover:bg-muted/40"
                  href="/shortlist/print"
                  target="_blank"
                  onClick={() => setOpen(false)}
                >
                  {t(language, "menu.print")}
                </Link>
                {isAdmin && (
                  <Link
                    className="block rounded px-2 py-2 text-sm hover:bg-muted/40"
                    href="/admin"
                    onClick={() => setOpen(false)}
                  >
                    <span className="flex items-center justify-between">
                      {t(language, "menu.admin")}
                      {hasNewFeedback && <span className="h-2 w-2 rounded-full bg-red-500" />}
                    </span>
                  </Link>
                )}
                <button
                  className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-muted/40"
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                >
                  {t(language, "menu.signout")}
                </button>
              </>
            ) : null}
            </div>
          )}
        </div>
      </div>
      {!isHome && <div className="hidden h-16 md:block" />}
    </>
  );
}
