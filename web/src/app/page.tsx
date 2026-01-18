"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, getLocale, LANGUAGE_EVENT, t } from "@/lib/i18n";

type WorkspaceRow = {
  id: string;
  child_name: string | null;
  home_postcode: string | null;
  home_house_number: string | null;
  advies_levels: string[];
  language?: Language | null;
};

type OpenDayRow = {
  id: string;
  starts_at: string | null;
  school_name: string | null;
  school?: Array<{ name: string | null } | null> | null;
};
type ShortlistRow = { id: string; workspace_id: string };
type ShortlistItemRow = { school_id: string };

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null);
  const [upcoming, setUpcoming] = useState<OpenDayRow[]>([]);
  const [shortlistIds, setShortlistIds] = useState<string[]>([]);
  const [dashError, setDashError] = useState<string>("");
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [hasFamilyMember, setHasFamilyMember] = useState(false);
  const [hasNote, setHasNote] = useState(false);
  const [hasRating, setHasRating] = useState(false);
  const [hasAttended, setHasAttended] = useState(false);

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

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      if (!email) return;

      const { workspace: ws, error: wErr } = await fetchCurrentWorkspace<WorkspaceRow>(
        "id,child_name,home_postcode,home_house_number,advies_levels,language"
      );

      if (!mounted) return;

      if (wErr) {
        setDashError(wErr);
        return;
      }

      const wsRow = (ws ?? null) as WorkspaceRow | null;
      setWorkspace(wsRow);
      setLanguage((wsRow?.language as Language) ?? DEFAULT_LANGUAGE);
      const workspaceId = wsRow?.id ?? "";

      const now = new Date();
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Shortlist ids (optional filter)
      const { data: shortlist, error: sErr } = await supabase
        .from("shortlists")
        .select("id,workspace_id")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (!mounted) return;

      if (sErr && sErr.code !== "PGRST116") {
        setDashError(sErr.message);
        return;
      }

      const shortlistRow = (shortlist ?? null) as ShortlistRow | null;
      let shortlistSchoolIds: string[] = [];
      if (shortlistRow?.id) {
        const { data: items, error: iErr } = await supabase
          .from("shortlist_items")
          .select("school_id")
          .eq("shortlist_id", shortlistRow.id);

        if (!mounted) return;

        if (iErr) {
          setDashError(iErr.message);
          return;
        }

        shortlistSchoolIds = ((items ?? []) as ShortlistItemRow[])
          .map((x) => x.school_id)
          .filter(Boolean);
      }
      setShortlistIds(shortlistSchoolIds);

      if (workspaceId) {
        const [
          { data: memberRows },
          { data: noteRows },
          { data: ratingRows },
          { data: attendedRows },
        ] = await Promise.all([
          supabase
            .from("workspace_members")
            .select("user_id")
            .eq("workspace_id", workspaceId)
            .limit(2),
          supabase
            .from("visit_notes")
            .select("id")
            .eq("workspace_id", workspaceId)
            .limit(1),
          supabase
            .from("visits")
            .select("id")
            .eq("workspace_id", workspaceId)
            .not("rating_stars", "is", null)
            .limit(1),
          supabase
            .from("visits")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("attended", true)
            .limit(1),
        ]);

        if (!mounted) return;

        setHasFamilyMember((memberRows ?? []).length > 1);
        setHasNote((noteRows ?? []).length > 0);
        setHasRating((ratingRows ?? []).length > 0);
        setHasAttended((attendedRows ?? []).length > 0);
      }

      let query = supabase
        .from("open_days")
        .select("id,starts_at,school_name,school:schools(name),school_id")
        .eq("is_active", true)
        .gte("starts_at", now.toISOString())
        .lte("starts_at", end.toISOString())
        .order("starts_at", { ascending: true })
        .limit(5);

      if (shortlistSchoolIds.length) {
        query = query.in("school_id", shortlistSchoolIds);
      }

      const { data: rows, error: oErr } = await query;

      if (!mounted) return;

      if (oErr) {
        setDashError(oErr.message);
        return;
      }

      setUpcoming((rows ?? []) as OpenDayRow[]);
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [email]);

  const setupNeeded = useMemo(() => {
    if (!workspace) return false;
    const hasChild = Boolean((workspace.child_name ?? "").trim());
    const hasAddress = Boolean(workspace.home_postcode && workspace.home_house_number);
    const hasAdvies = (workspace.advies_levels ?? []).length > 0;
    return !hasChild || !hasAddress || !hasAdvies;
  }, [workspace]);

  const progressState = useMemo(() => {
    const profileDone = !setupNeeded;
    const milestones = [
      {
        key: "profile",
        done: profileDone,
        tipKey: "dashboard.tip_profile",
        href: "/settings",
        ctaKey: "dashboard.tip_cta_settings",
      },
      {
        key: "invite",
        done: hasFamilyMember,
        tipKey: "dashboard.tip_invite",
        href: "/settings",
        ctaKey: "dashboard.tip_cta_settings",
      },
      {
        key: "shortlist",
        done: shortlistIds.length > 0,
        tipKey: "dashboard.tip_shortlist",
        href: "/schools",
        ctaKey: "dashboard.tip_cta_schools",
      },
      {
        key: "note",
        done: hasNote,
        tipKey: "dashboard.tip_note",
        href: "/schools",
        ctaKey: "dashboard.tip_cta_schools",
      },
      {
        key: "rating",
        done: hasRating,
        tipKey: "dashboard.tip_rating",
        href: "/schools",
        ctaKey: "dashboard.tip_cta_schools",
      },
      {
        key: "attended",
        done: hasAttended,
        tipKey: "dashboard.tip_attended",
        href: "/planner",
        ctaKey: "dashboard.tip_cta_open_days",
      },
    ];
    const completed = milestones.filter((m) => m.done).length;
    const total = milestones.length;
    const percent = Math.round((completed / total) * 100);
    const next = milestones.find((m) => !m.done);
    return { completed, total, percent, next };
  }, [setupNeeded, hasFamilyMember, shortlistIds, hasNote, hasRating, hasAttended]);

  useEffect(() => {
    function onLang(e: Event) {
      const next = (e as CustomEvent<Language>).detail;
      if (next) setLanguage(next);
    }
    window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
  }, []);

  const locale = getLocale(language);

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
            {t(DEFAULT_LANGUAGE, "dashboard.signin_body")}
          </p>
          <Link className="inline-block rounded-md border px-3 py-2" href="/login">
            {t(DEFAULT_LANGUAGE, "login.sign_in")}
          </Link>

          <div className="pt-2 text-xs text-muted-foreground">
            {t(DEFAULT_LANGUAGE, "dashboard.tip")}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-3xl rounded-xl border p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{t(language, "dashboard.title")}</h1>
          {workspace?.child_name ? (
            <p className="text-sm text-muted-foreground">
              {t(language, "dashboard.welcome")}, {workspace.child_name}
            </p>
          ) : null}
        </div>

        {dashError && <p className="text-sm text-red-600">Error: {dashError}</p>}

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">{t(language, "dashboard.progress_title")}</div>
            <div className="text-sm text-muted-foreground">
              {progressState.percent}% {t(language, "dashboard.progress_complete")}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-lg leading-none">
              {Array.from({ length: progressState.total }).map((_, idx) => {
                const filled = idx < progressState.completed;
                return (
                  <span key={`milestone-${idx}`} aria-hidden="true">
                    {filled ? "⭐️" : "⚪️"}
                  </span>
                );
              })}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-foreground"
                style={{ width: `${progressState.percent}%` }}
              />
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {progressState.next
              ? t(language, progressState.next.tipKey)
              : t(language, "dashboard.tip_done")}
          </div>
          {progressState.next ? (
            <Link className="text-sm underline" href={progressState.next.href}>
              {t(language, progressState.next.ctaKey)}
            </Link>
          ) : null}
        </div>

        {setupNeeded && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="font-medium">{t(language, "dashboard.finish_setup")}</div>
            <div className="text-sm text-muted-foreground">
              {t(language, "dashboard.finish_setup_body")}
            </div>
            <Link className="inline-block rounded-md border px-3 py-2 text-sm" href="/settings">
              {t(language, "dashboard.finish_setup_cta")}
            </Link>
          </div>
        )}

        <div className="rounded-lg border p-4 space-y-2">
          <div className="font-medium">
            {t(language, "dashboard.upcoming")}
            {shortlistIds.length ? " • Shortlist" : ""}
          </div>
          {upcoming.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t(language, "dashboard.no_upcoming")}</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcoming.map((r) => {
                const name = r.school?.[0]?.name ?? r.school_name ?? "School";
                const date = r.starts_at ? new Date(r.starts_at).toLocaleDateString(locale) : "—";
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{name}</span>
                    <span className="text-muted-foreground">{date}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="pt-2">
            <Link className="text-sm underline" href="/planner">
              {t(language, "dashboard.view_all")}
            </Link>
          </div>
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          Tip: Open day details can change — always verify on the school website.
        </div>
      </div>
    </main>
  );
}
