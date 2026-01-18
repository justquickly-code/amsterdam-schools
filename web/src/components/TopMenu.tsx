"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_LANGUAGE, Language, emitLanguageChanged, LANGUAGE_EVENT, t } from "@/lib/i18n";
import { fetchCurrentWorkspace, WorkspaceRole } from "@/lib/workspace";

export default function TopMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
      setIsAdmin(false);
    });

    (async () => {
      const { workspace, role } = await fetchCurrentWorkspace<{ id: string; language?: Language | null }>(
        "id,language"
      );
      setLanguage((workspace?.language as Language) ?? DEFAULT_LANGUAGE);
      setWorkspaceId(workspace?.id ?? "");
      setRole(role ?? null);
    })().catch(() => null);

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
    if (!workspaceId) return;
    if (next === language) return;
    const { error } = await supabase
      .from("workspaces")
      .update({ language: next })
      .eq("id", workspaceId);
    if (!error) setLanguage(next);
    if (!error) emitLanguageChanged(next);
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
            {role === "owner" && (
              <div className="px-2 py-1">
                <div className="text-xs text-muted-foreground mb-1">
                  {t(language, "settings.language")}
                </div>
                <button
                  type="button"
                  className="relative inline-flex h-8 w-24 items-center rounded-full border bg-muted/30 px-1 text-[11px]"
                  onClick={() => updateLanguage(language === "nl" ? "en" : "nl")}
                  aria-label="Toggle language"
                >
                  <span
                    className={`absolute h-6 w-11 rounded-full bg-white shadow transition-transform ${
                      language === "nl" ? "translate-x-0" : "translate-x-12"
                    }`}
                  />
                  <span className={`relative z-10 w-11 text-center ${language === "nl" ? "" : "text-muted-foreground"}`}>
                    NL
                  </span>
                  <span className={`relative z-10 w-11 text-center ${language === "en" ? "" : "text-muted-foreground"}`}>
                    EN
                  </span>
                </button>
              </div>
            )}
            <Link
              className="block rounded px-2 py-2 text-sm hover:bg-muted/40"
              href="/settings"
              onClick={() => setOpen(false)}
            >
              {t(language, "menu.settings")}
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
                {t(language, "menu.admin")}
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
          </div>
        )}
      </div>
    </div>
  );
}
