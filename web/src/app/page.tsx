"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, getLocale, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { formatDateRange, getNextTimelineItems } from "@/lib/keuzegidsTimeline";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null);
  const [upcoming, setUpcoming] = useState<OpenDayRow[]>([]);
  const [shortlistIds, setShortlistIds] = useState<string[]>([]);
  const [dashError, setDashError] = useState<string>("");
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    const stored = window.localStorage.getItem("schools_language");
    return stored === "en" || stored === "nl" ? stored : DEFAULT_LANGUAGE;
  });
  const [hasFamilyMember, setHasFamilyMember] = useState(false);
  const [hasNote, setHasNote] = useState(false);
  const [hasRating, setHasRating] = useState(false);
  const [hasAttended, setHasAttended] = useState(false);
  const [hasTutorial, setHasTutorial] = useState(false);

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
      setLanguage((wsRow?.language as Language) ?? readStoredLanguage());
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
        const inviteSent =
          typeof window !== "undefined" && window.localStorage.getItem(`invite_sent_${workspaceId}`) === "1";
        const { data: session } = await supabase.auth.getSession();
        const userId = session.session?.user?.id ?? "";
        const [
          { data: memberRows },
          { data: noteRows },
          { data: ratingRows },
          { data: attendedRows },
          { data: tutorialRow },
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
          userId
            ? supabase
                .from("workspace_members")
                .select("tutorial_completed_at")
                .eq("workspace_id", workspaceId)
                .eq("user_id", userId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        if (!mounted) return;

        setHasFamilyMember((memberRows ?? []).length > 1 || inviteSent);
        setHasNote((noteRows ?? []).length > 0);
        setHasRating((ratingRows ?? []).length > 0);
        setHasAttended((attendedRows ?? []).length > 0);
        setHasTutorial(Boolean((tutorialRow as { tutorial_completed_at?: string | null } | null)?.tutorial_completed_at));
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
        labelKey: "dashboard.milestone_profile",
      },
      {
        key: "invite",
        done: hasFamilyMember,
        tipKey: "dashboard.tip_invite",
        href: "/settings",
        ctaKey: "dashboard.tip_cta_settings",
        labelKey: "dashboard.milestone_invite",
      },
      {
        key: "shortlist",
        done: shortlistIds.length > 0,
        tipKey: "dashboard.tip_shortlist",
        href: "/schools",
        ctaKey: "dashboard.tip_cta_schools",
        labelKey: "dashboard.milestone_shortlist",
      },
      {
        key: "note",
        done: hasNote,
        tipKey: "dashboard.tip_note",
        href: "/schools",
        ctaKey: "dashboard.tip_cta_schools",
        labelKey: "dashboard.milestone_note",
      },
      {
        key: "rating",
        done: hasRating,
        tipKey: "dashboard.tip_rating",
        href: "/schools",
        ctaKey: "dashboard.tip_cta_schools",
        labelKey: "dashboard.milestone_rating",
      },
      {
        key: "tutorial",
        done: hasTutorial,
        tipKey: "dashboard.tip_tutorial",
        href: "/how-it-works",
        ctaKey: "dashboard.tip_cta_tutorial",
        labelKey: "dashboard.milestone_tutorial",
      },
      {
        key: "attended",
        done: hasAttended,
        tipKey: "dashboard.tip_attended",
        href: "/planner",
        ctaKey: "dashboard.tip_cta_open_days",
        labelKey: "dashboard.milestone_attended",
      },
    ];
    const completed = milestones.filter((m) => m.done).length;
    const total = milestones.length;
    const percent = Math.round((completed / total) * 100);
    const next = milestones.find((m) => !m.done);
    const recent = milestones.filter((m) => m.done).slice(-2);
    return { completed, total, percent, next, recent };
  }, [setupNeeded, hasFamilyMember, shortlistIds, hasNote, hasRating, hasTutorial, hasAttended]);

  useEffect(() => {
    function onLang(e: Event) {
      const next = (e as CustomEvent<Language>).detail;
      if (next) setLanguage(next);
    }
    window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("schools_language", language);
  }, [language]);

  useEffect(() => {
    if (!loading && !email) {
      router.replace("/login");
    }
  }, [loading, email, router]);

  const locale = getLocale(language);
  const nextDates = useMemo(() => getNextTimelineItems(new Date(), 2), []);

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
        <p className="text-sm text-muted-foreground">{t(language, "login.sign_in")}</p>
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
          {progressState.recent.length ? (
            <div className="text-xs text-muted-foreground">
              {t(language, "dashboard.recent_title")}{" "}
              {progressState.recent.map((m) => t(language, m.labelKey)).join(", ")}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">{t(language, "dashboard.recent_empty")}</div>
          )}
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
          <div className="font-medium">{t(language, "dashboard.next_dates_title")}</div>
          {nextDates.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t(language, "dashboard.next_dates_none")}</div>
          ) : (
            <ul className="text-sm text-muted-foreground space-y-1">
              {nextDates.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span>{t(language, item.titleKey)}</span>
                  <span>{formatDateRange(item, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

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
