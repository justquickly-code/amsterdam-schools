"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchCurrentWorkspace, WorkspaceRole } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, t } from "@/lib/i18n";

type WorkspaceRow = {
  child_name: string | null;
  home_postcode: string | null;
  home_house_number: string | null;
  advies_levels: string[] | null;
  language?: Language | null;
};

export default function SetupGate({
  children,
  bypass,
  showNav,
  nav,
}: {
  children: React.ReactNode;
  bypass: boolean;
  showNav: boolean;
  nav: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [gate, setGate] = useState(false);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    const stored = window.localStorage.getItem("schools_language");
    return stored === "en" || stored === "nl" ? stored : DEFAULT_LANGUAGE;
  });
  const [recentCompletion, setRecentCompletion] = useState(() => {
    if (typeof window === "undefined") return false;
    const ts = window.localStorage.getItem("setup_completed_at");
    if (!ts) return false;
    const ageMs = Date.now() - new Date(ts).getTime();
    return Number.isFinite(ageMs) && ageMs < 2 * 60 * 1000;
  });

  useEffect(() => {
    let mounted = true;

    async function check() {
      if (bypass) {
        setLoading(false);
        return;
      }

      const { workspace, role, error: wErr } = await fetchCurrentWorkspace<WorkspaceRow>(
        "child_name,home_postcode,home_house_number,advies_levels,language"
      );

      if (!mounted) return;

      if (wErr) {
        setLoading(false);
        return;
      }

      setRole(role ?? null);
      const stored =
        typeof window !== "undefined" ? window.localStorage.getItem("schools_language") : null;
      const fallback = stored === "en" || stored === "nl" ? stored : DEFAULT_LANGUAGE;
      setLanguage((workspace?.language as Language) ?? (fallback as Language));
      const ws = (workspace ?? null) as WorkspaceRow | null;
      const hasChild = Boolean((ws?.child_name ?? "").trim());
      const hasAddress = Boolean(ws?.home_postcode && ws?.home_house_number);
      const hasAdvies = (ws?.advies_levels ?? []).length > 0;
      setGate(!(hasChild && hasAddress && hasAdvies));
      setLoading(false);
    }

    check();
    return () => {
      mounted = false;
    };
  }, [bypass]);

  useEffect(() => {
    const param = searchParams.get("setup");
    if (param !== "done") return;
    setRecentCompletion(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("setup_completed_at", new Date().toISOString());
    }
  }, [searchParams]);

  useEffect(() => {
    if (!recentCompletion) return;
    const timer = window.setTimeout(() => setRecentCompletion(false), 5000);
    return () => window.clearTimeout(timer);
  }, [recentCompletion]);

  useEffect(() => {
    const onLang = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next) setLanguage(next);
    };
    window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
  }, []);

  useEffect(() => {
    if (!gate) return;
    if (searchParams.get("setup") === "done") return;
    if (recentCompletion) return;
    if (role && role !== "owner") return;
    if (pathname === "/setup") return;
    setRedirecting(true);
    router.replace("/setup");
  }, [gate, role, pathname, router, recentCompletion, searchParams]);

  if (loading) {
    return (
      <div className={showNav ? "pb-20" : ""}>
        {children}
        {showNav ? nav : null}
      </div>
    );
  }

  if (gate) {
    if (role && role !== "owner") {
      return (
        <main className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-xl border p-6 space-y-3 text-sm">
            <div className="text-base font-semibold">{t(language, "setup.required_title")}</div>
            <p className="text-muted-foreground">
              {t(language, "setup.required_body")}
            </p>
          </div>
        </main>
      );
    }
    if (redirecting) {
      return (
        <div className={showNav ? "pb-20" : ""}>
          {children}
          {showNav ? nav : null}
        </div>
      );
    }
  }

  return (
    <div className={showNav ? "pb-20" : ""}>
      {children}
      {showNav ? nav : null}
    </div>
  );
}
