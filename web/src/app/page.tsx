"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, getLocale, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { formatDateRange, getNextTimelineItems } from "@/lib/keuzegidsTimeline";
import { shortlistRankCapForLevels } from "@/lib/levels";
import { useRouter } from "next/navigation";
import { InfoCard, ListGroup, ListRow, ProgressCard, Wordmark } from "@/components/schoolkeuze";

type WorkspaceRow = {
  id: string;
  child_name: string | null;
  home_postcode: string | null;
  home_house_number: string | null;
  advies_levels: string[];
  language?: Language | null;
};

type PlannedOpenDayRow = {
  open_day?: {
    id: string;
    starts_at: string | null;
    school_id: string | null;
    school_name: string | null;
    school?: Array<{ id: string; name: string } | null> | null;
  } | null;
};
type PlannedOpenDayRowRaw = {
  open_day?:
    | {
        id: string;
        starts_at: string | null;
        school_id: string | null;
        school_name: string | null;
        school?: Array<{ id: string; name: string } | null> | null;
      }
    | Array<{
        id: string;
        starts_at: string | null;
        school_id: string | null;
        school_name: string | null;
        school?: Array<{ id: string; name: string } | null> | null;
      }>
    | null;
};
type ShortlistRow = { id: string; workspace_id: string };
type ShortlistItemRow = { school_id: string; rank: number | null };

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null);
  const [plannedOpenDays, setPlannedOpenDays] = useState<PlannedOpenDayRow[]>([]);
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
  const [hasCompleteShortlist, setHasCompleteShortlist] = useState(false);

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
      const rankCap = shortlistRankCapForLevels(wsRow?.advies_levels ?? []);

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
      let rankedCount = 0;
      if (shortlistRow?.id) {
        const { data: items, error: iErr } = await supabase
          .from("shortlist_items")
          .select("school_id,rank")
          .eq("shortlist_id", shortlistRow.id);

        if (!mounted) return;

        if (iErr) {
          setDashError(iErr.message);
          return;
        }

        const list = (items ?? []) as ShortlistItemRow[];
        shortlistSchoolIds = list.map((x) => x.school_id).filter(Boolean);
        rankedCount = list.filter((x) => typeof x.rank === "number" && (x.rank as number) <= rankCap).length;
      }
      setShortlistIds(shortlistSchoolIds);
      setHasCompleteShortlist(rankCap > 0 && rankedCount >= rankCap);

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

      if (workspaceId) {
        const { data: plannedRows, error: pErr } = await supabase
          .from("planned_open_days")
          .select("open_day:open_days(id,starts_at,school_id,school_name,school:schools(id,name))")
          .eq("workspace_id", workspaceId);

        if (!mounted) return;

        if (pErr) {
          setDashError(pErr.message);
          return;
        }

        const normalized = (plannedRows ?? []).map((row) => {
          const r = row as PlannedOpenDayRowRaw;
          const openDay = Array.isArray(r.open_day) ? r.open_day[0] ?? null : r.open_day ?? null;
          return { open_day: openDay } as PlannedOpenDayRow;
        });
        setPlannedOpenDays(normalized);
      }
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
        key: "shortlist_complete",
        done: hasCompleteShortlist,
        tipKey: "dashboard.tip_shortlist_complete",
        href: "/shortlist",
        ctaKey: "dashboard.tip_cta_shortlist",
        labelKey: "dashboard.milestone_shortlist_complete",
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
  }, [setupNeeded, hasFamilyMember, shortlistIds, hasCompleteShortlist, hasNote, hasRating, hasTutorial, hasAttended]);

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

  const nextDates = useMemo(() => getNextTimelineItems(new Date(), 6), []);

  const plannerItems = useMemo(() => {
    const now = new Date();
    const locale = getLocale(language);
    const timeline: Array<{
      id: string;
      title: string;
      value: string;
      href: string;
      sortTs: number;
      isToday: boolean;
    }> = [];

    for (const item of nextDates) {
      const start = new Date(`${item.start}T00:00:00`);
      timeline.push({
        id: `timeline-${item.id}`,
        title: t(language, item.titleKey),
        value: formatDateRange(item, locale),
        href: "/how-it-works",
        sortTs: start.getTime(),
        isToday: false,
      });
    }

    const planned: Array<{
      id: string;
      title: string;
      value: string;
      href: string;
      sortTs: number;
      isToday: boolean;
    }> = [];

    for (const row of plannedOpenDays) {
      const openDay = row.open_day ?? null;
      if (!openDay) continue;
      const start = openDay.starts_at ? new Date(openDay.starts_at) : null;
      const isToday = start ? start.toDateString() === now.toDateString() : false;
      const name = openDay.school?.[0]?.name ?? openDay.school_name ?? "School";
      const value = start
        ? `${start.toLocaleDateString(locale, { day: "numeric", month: "short" })} · ${start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`
        : "—";
      planned.push({
        id: `planned-${openDay.id}`,
        title: name,
        value,
        href: openDay.school_id ? `/schools/${openDay.school_id}` : "/planner",
        sortTs: start ? start.getTime() : Number.POSITIVE_INFINITY,
        isToday,
      });
    }

    const plannedToday = planned.filter((i) => i.isToday);
    const plannedSorted = [...planned].sort((a, b) => a.sortTs - b.sortTs);
    const remainingCap = Math.max(0, 6 - plannedToday.length);
    const plannedDisplay = [
      ...plannedToday,
      ...plannedSorted.filter((i) => !i.isToday).slice(0, remainingCap),
    ];

    return { timeline, planned: plannedDisplay };
  }, [language, nextDates, plannedOpenDays]);

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

  const recentText = progressState.recent.length
    ? progressState.recent.map((m) => t(language, m.labelKey)).join(", ")
    : "";

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col gap-2">
          <Wordmark />
          <h1 className="text-3xl font-semibold text-foreground">
            {workspace?.child_name
              ? t(language, "dashboard.title_named").replace("{name}", workspace.child_name)
              : t(language, "dashboard.title")}
          </h1>
        </header>

        {dashError && <p className="text-sm text-red-600">Error: {dashError}</p>}

        <ProgressCard
          title={t(language, "dashboard.progress_title")}
          progress={progressState.percent}
          totalSteps={progressState.total}
          completedSteps={progressState.completed}
          message={
            progressState.next
              ? t(language, progressState.next.tipKey)
              : t(language, "dashboard.tip_done")
          }
          recentActivity={progressState.recent.length ? recentText : undefined}
        />
        {progressState.next ? (
          <Link className="text-sm underline" href={progressState.next.href}>
            {t(language, progressState.next.ctaKey)}
          </Link>
        ) : (
          <div className="text-xs text-muted-foreground">{t(language, "dashboard.recent_empty")}</div>
        )}

        {setupNeeded && (
          <InfoCard title={t(language, "dashboard.finish_setup")}>
            <div className="text-sm text-muted-foreground">
              {t(language, "dashboard.finish_setup_body")}
            </div>
            <Link className="inline-block rounded-md border px-3 py-2 text-sm" href="/settings">
              {t(language, "dashboard.finish_setup_cta")}
            </Link>
          </InfoCard>
        )}

        <InfoCard title={t(language, "dashboard.planner_title")}>
          {plannerItems.timeline.length === 0 && plannerItems.planned.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t(language, "dashboard.planner_empty")}</div>
          ) : (
            <div className="space-y-4">
              {plannerItems.timeline.length > 0 && (
                <ListGroup title={t(language, "dashboard.planner_important")}>
                  {plannerItems.timeline.map((item) => (
                    <ListRow
                      key={item.id}
                      title={item.title}
                      value={item.value}
                      showArrow
                      onClick={() => router.push(item.href)}
                    />
                  ))}
                </ListGroup>
              )}
              {plannerItems.planned.length > 0 && (
                <ListGroup title={t(language, "dashboard.planner_open_days")}>
                  {plannerItems.planned.map((item) => (
                    <ListRow
                      key={item.id}
                      title={item.title}
                      value={item.value}
                      showArrow
                      onClick={() => router.push(item.href)}
                    />
                  ))}
                </ListGroup>
              )}
            </div>
          )}
        </InfoCard>
      </div>
    </main>
  );
}
