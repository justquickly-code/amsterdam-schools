"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import {
  DEFAULT_LANGUAGE,
  Language,
  LANGUAGE_EVENT,
  emitLanguageChanged,
  readStoredLanguage,
  setStoredLanguage,
  t,
} from "@/lib/i18n";
import { friendlyLevel, shortlistRankCapForLevels } from "@/lib/levels";
import { useRouter } from "next/navigation";
import { InfoCard } from "@/components/schoolkeuze";

const IconBase = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const ShareIcon = () => (
  <IconBase className="h-5 w-5">
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M8.2 11l6.6-3.3" />
    <path d="M8.2 13l6.6 3.3" />
  </IconBase>
);
const NoteIcon = () => (
  <IconBase className="h-5 w-5">
    <path d="M7 3h8l4 4v14H7z" />
    <path d="M15 3v5h5" />
  </IconBase>
);
const HelpIcon = () => (
  <IconBase className="h-5 w-5">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.3-1.5 1.1-1.5 2.2" />
    <circle cx="12" cy="17" r="1" />
  </IconBase>
);
const SettingsIcon = () => (
  <IconBase className="h-5 w-5">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1 1 0 0 0 .2-1.1l-1-1.8a7.8 7.8 0 0 0 0-2.2l1-1.8a1 1 0 0 0-.2-1.1l-1.5-1.5a1 1 0 0 0-1.1-.2l-1.8 1a7.8 7.8 0 0 0-2.2 0l-1.8-1a1 1 0 0 0-1.1.2L7 5.8a1 1 0 0 0-.2 1.1l1 1.8a7.8 7.8 0 0 0 0 2.2l-1 1.8a1 1 0 0 0 .2 1.1l1.5 1.5a1 1 0 0 0 1.1.2l1.8-1a7.8 7.8 0 0 0 2.2 0l1.8 1a1 1 0 0 0 1.1-.2z" />
  </IconBase>
);
const LogoutIcon = () => (
  <IconBase className="h-5 w-5">
    <path d="M10 16l-4-4 4-4" />
    <path d="M6 12h12" />
    <path d="M14 4h4v16h-4" />
  </IconBase>
);
const HeartIcon = () => (
  <IconBase className="h-6 w-6">
    <path d="M12 21s-7-4.6-9-8.5C1.4 9.5 3.5 6 7 6c2 0 3.3 1.2 5 3 1.7-1.8 3-3 5-3 3.5 0 5.6 3.5 4 6.5C19 16.4 12 21 12 21z" />
  </IconBase>
);
const CalendarIcon = () => (
  <IconBase className="h-6 w-6">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M7 3v4M17 3v4M3 9h18" />
  </IconBase>
);
const MapPinIcon = () => (
  <IconBase className="h-4 w-4">
    <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" />
    <circle cx="12" cy="11" r="2.5" />
  </IconBase>
);
const CapIcon = () => (
  <IconBase className="h-4 w-4">
    <path d="M3 9l9-4 9 4-9 4z" />
    <path d="M7 12v4c0 1.1 2.2 2 5 2s5-.9 5-2v-4" />
  </IconBase>
);
const SearchIcon = () => (
  <IconBase className="h-5 w-5">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </IconBase>
);
const HomeIcon = () => (
  <IconBase className="h-5 w-5">
    <path d="M3 10l9-7 9 7" />
    <path d="M5 10v10h14V10" />
  </IconBase>
);
const CheckIcon = () => (
  <IconBase className="h-5 w-5">
    <path d="M5 12l4 4 10-10" />
  </IconBase>
);

type WorkspaceRow = {
  id: string;
  child_name: string | null;
  home_postcode: string | null;
  home_house_number: string | null;
  advies_levels: string[];
  language?: Language | null;
};

type ShortlistRow = { id: string; workspace_id: string };
type ShortlistItemRow = { school_id: string; rank: number | null };

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null);
  const [shortlistIds, setShortlistIds] = useState<string[]>([]);
  const [dashError, setDashError] = useState<string>("");
  const [language, setLanguage] = useState<Language>(() => readStoredLanguage());
  const [hasAttended, setHasAttended] = useState(false);
  const [hasCompleteShortlist, setHasCompleteShortlist] = useState(false);
  const [visitedCount, setVisitedCount] = useState(0);
  const [plannedCount, setPlannedCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

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
        const [
          { data: attendedRows },
          { data: attendedCountRows },
        ] = await Promise.all([
          supabase
            .from("visits")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("attended", true)
            .limit(1),
          supabase
            .from("visits")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("attended", true),
        ]);

        if (!mounted) return;

        setHasAttended((attendedRows ?? []).length > 0);
        setVisitedCount((attendedCountRows ?? []).length);
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
          const r = row as { open_day?: { id?: string } | Array<{ id?: string }> | null };
          const openDay = Array.isArray(r.open_day) ? r.open_day[0] ?? null : r.open_day ?? null;
          return openDay?.id ?? null;
        }).filter(Boolean);
        setPlannedCount(normalized.length);
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
    setStoredLanguage(language);
    emitLanguageChanged(language);
  }, [language]);

  useEffect(() => {
    if (!loading && !email) {
      router.replace("/login");
    }
  }, [loading, email, router]);

  useEffect(() => {
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
  }, []);

  async function updateLanguage(next: Language) {
    if (next === language) return;
    if (workspace?.id) {
      const { error } = await supabase
        .from("workspaces")
        .update({ language: next })
        .eq("id", workspace.id);
      if (error) return;
    }
    setLanguage(next);
    if (typeof window !== "undefined") {
      setStoredLanguage(next);
      emitLanguageChanged(next);
    }
  }

  const journeySteps = useMemo(() => {
    const doneProfile = !setupNeeded;
    const doneDiscover = shortlistIds.length > 0;
    const doneList = hasCompleteShortlist;
    const doneDays = plannedCount > 0 || hasAttended;
    const doneChoice = false;
    return [
      { key: "start", labelKey: "profile.journey_start", done: doneProfile, Icon: HomeIcon },
      { key: "discover", labelKey: "profile.journey_discover", done: doneDiscover, Icon: SearchIcon },
      { key: "list", labelKey: "profile.journey_list", done: doneList, Icon: HeartIcon },
      { key: "days", labelKey: "profile.journey_days", done: doneDays, Icon: CalendarIcon },
      { key: "choice", labelKey: "profile.journey_choice", done: doneChoice, Icon: CheckIcon },
    ];
  }, [setupNeeded, shortlistIds.length, hasCompleteShortlist, plannedCount, hasAttended]);

  const journeyProgress = useMemo(() => {
    const lastDoneIndex = [...journeySteps].reverse().findIndex((s) => s.done);
    const idx = lastDoneIndex === -1 ? -1 : journeySteps.length - 1 - lastDoneIndex;
    const progressIndex = Math.max(idx, 0);
    const pct = journeySteps.length > 1 ? (progressIndex / (journeySteps.length - 1)) * 100 : 0;
    return { progressIndex, pct };
  }, [journeySteps]);

  const adviceLabel = useMemo(() => {
    const levels = workspace?.advies_levels ?? [];
    if (!levels.length) return "";
    return levels.map(friendlyLevel).join(" / ");
  }, [workspace]);

  const addressLabel = useMemo(() => {
    if (!workspace?.home_postcode || !workspace?.home_house_number) return "";
    return `${workspace.home_postcode} ${workspace.home_house_number}`;
  }, [workspace]);

  const initials = useMemo(() => {
    const name = (workspace?.child_name ?? "").trim();
    if (!name) return "MS";
    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  }, [workspace]);

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
    <main className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-to-br from-primary/10 via-background to-accent/10 pt-8 pb-6 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {workspace?.child_name
                  ? t(language, "profile.title_named").replace("{name}", workspace.child_name)
                  : t(language, "profile.title")}
              </h1>
              {addressLabel ? (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPinIcon />
                  {addressLabel}
                </p>
              ) : null}
              {adviceLabel ? (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-foreground">
                  <CapIcon />
                  {adviceLabel} {t(language, "profile.advice_suffix")}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6 -mt-2">

        {dashError && <p className="text-sm text-red-600">Error: {dashError}</p>}

        <InfoCard title={t(language, "profile.journey_title")}>
          <div className="text-center text-sm text-muted-foreground">
            {t(language, "profile.list_count").replace("{count}", String(shortlistIds.length))}
          </div>
          <div className="relative mt-4">
            <div className="absolute left-5 right-5 top-5 h-0.5 bg-border" />
            <div
              className="absolute left-5 top-5 h-0.5 bg-primary"
              style={{ width: `${Math.min(100, journeyProgress.pct)}%` }}
            />
            <div className="flex justify-between">
              {journeySteps.map((step) => {
                const DoneIcon = step.Icon;
                const done = step.done;
                return (
                  <div key={step.key} className="flex flex-col items-center gap-2 w-full">
                    <div
                      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border ${
                        done ? "border-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <DoneIcon />
                    </div>
                    <span className={`text-xs ${done ? "text-primary" : "text-muted-foreground"}`}>
                      {t(language, step.labelKey)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </InfoCard>

        <section className="grid grid-cols-3 gap-3">
          {[
            { value: shortlistIds.length, label: t(language, "profile.stats_list"), color: "text-foreground" },
            { value: plannedCount, label: t(language, "profile.stats_planned"), color: "text-accent" },
            { value: visitedCount, label: t(language, "profile.stats_visited"), color: "text-chart-3" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl p-3 text-center shadow-sm">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </section>

        <section className="flex gap-3">
          <Link
            href="/shortlist"
            className="flex-1 bg-primary/10 rounded-2xl p-4 flex flex-col items-center gap-2"
          >
            <HeartIcon />
            <span className="text-sm font-medium text-foreground">{t(language, "profile.cta_my_list")}</span>
          </Link>
          <Link
            href="/planner"
            className="flex-1 bg-accent/10 rounded-2xl p-4 flex flex-col items-center gap-2"
          >
            <CalendarIcon />
            <span className="text-sm font-medium text-foreground">{t(language, "profile.cta_open_days")}</span>
          </Link>
        </section>

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

        <section className="bg-card rounded-2xl overflow-hidden shadow-sm divide-y divide-border">
          {[
            {
              icon: SettingsIcon,
              label: t(language, "profile.link_settings"),
              description: t(language, "profile.desc_settings"),
              action: () => router.push("/settings"),
            },
            {
              icon: SearchIcon,
              label: t(language, "profile.link_language"),
              description: t(language, "profile.desc_language"),
              action: () => updateLanguage(language === "nl" ? "en" : "nl"),
              badge: language === "nl" ? "NL" : "EN",
            },
            {
              icon: HelpIcon,
              label: t(language, "menu.how_it_works"),
              description: t(language, "profile.desc_how"),
              action: () => router.push("/how-it-works"),
            },
            {
              icon: NoteIcon,
              label: t(language, "profile.link_feedback"),
              description: t(language, "profile.desc_feedback"),
              action: () => router.push("/feedback"),
            },
            isAdmin
              ? {
                  icon: SettingsIcon,
                  label: t(language, "menu.admin"),
                  description: t(language, "profile.desc_admin"),
                  action: () => router.push("/admin"),
                }
              : null,
            {
              icon: ShareIcon,
              label: t(language, "profile.link_invite"),
              description: t(language, "profile.desc_invite"),
              action: () => router.push("/settings"),
            },
            {
              icon: HelpIcon,
              label: t(language, "menu.about"),
              description: t(language, "profile.desc_about"),
              action: () => router.push("/about"),
            },
          ]
            .filter(Boolean)
            .map((item) => {
              const icon = (item as { icon: () => ReactNode }).icon;
              return (
                <button
                  key={(item as { label: string }).label}
                  onClick={(item as { action: () => void }).action}
                  className="flex w-full items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                    {icon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{(item as { label: string }).label}</span>
                      {(item as { badge?: string }).badge ? (
                        <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">
                          {(item as { badge: string }).badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {(item as { description: string }).description}
                    </p>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </button>
              );
            })}
        </section>

        <section className="rounded-2xl border bg-card">
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogoutIcon />
            {t(language, "menu.signout")}
          </button>
        </section>
      </div>
    </main>
  );
}
