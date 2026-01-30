"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import {
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
import { badgeSecondary } from "@/lib/badges";
import { buttonOutline, buttonOutlinePill } from "@/lib/ui";
import {
  Calendar,
  Check,
  FileText,
  GraduationCap,
  Heart,
  HelpCircle,
  Home as HomeIconLucide,
  LogOut,
  MapPin,
  Search,
  Settings,
  Share2,
} from "lucide-react";

const ShareIcon = () => <Share2 className="h-5 w-5" />;
const NoteIcon = () => <FileText className="h-5 w-5" />;
const HelpIcon = () => <HelpCircle className="h-5 w-5" />;
const SettingsIcon = () => <Settings className="h-5 w-5" />;
const LogoutIcon = () => <LogOut className="h-5 w-5" />;
const HeartIcon = () => <Heart className="h-6 w-6" />;
const CalendarIcon = () => <Calendar className="h-6 w-6" />;
const MapPinIcon = () => <MapPin className="h-4 w-4" />;
const CapIcon = () => <GraduationCap className="h-4 w-4" />;
const SearchIcon = () => <Search className="h-5 w-5" />;
const HomeIcon = () => <HomeIconLucide className="h-5 w-5" />;
const CheckIcon = () => <Check className="h-5 w-5" />;

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
  const [hasRatedVisit, setHasRatedVisit] = useState(false);
  const [hasVisitNotes, setHasVisitNotes] = useState(false);
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
      const storedLang = readStoredLanguage();
      const wsLang = (wsRow?.language as Language | null) ?? null;
      if (storedLang && storedLang !== wsLang && wsRow?.id) {
        await supabase.from("workspaces").update({ language: storedLang }).eq("id", wsRow.id);
        setLanguage(storedLang);
      } else {
        setLanguage(wsLang ?? storedLang);
      }
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
          { data: ratingRows },
          { data: notesRows },
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
          supabase
            .from("visits")
            .select("id,rating_stars")
            .eq("workspace_id", workspaceId)
            .not("rating_stars", "is", null)
            .limit(1),
          supabase
            .from("visit_notes")
            .select("id,notes,user_id")
            .eq("workspace_id", workspaceId)
            .not("notes", "is", null)
            .limit(1),
        ]);

        if (!mounted) return;

        setHasAttended((attendedRows ?? []).length > 0);
        setVisitedCount((attendedCountRows ?? []).length);
        setHasRatedVisit((ratingRows ?? []).length > 0);
        setHasVisitNotes((notesRows ?? []).length > 0);
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
    const doneDays = plannedCount > 0;
    const doneChoice = hasCompleteShortlist && hasAttended && hasRatedVisit && hasVisitNotes;
    return [
      { key: "start", labelKey: "profile.journey_start", done: doneProfile, Icon: HomeIcon },
      { key: "discover", labelKey: "profile.journey_discover", done: doneDiscover, Icon: SearchIcon },
      { key: "list", labelKey: "profile.journey_list", done: doneList, Icon: HeartIcon },
      { key: "days", labelKey: "profile.journey_days", done: doneDays, Icon: CalendarIcon },
      { key: "choice", labelKey: "profile.journey_choice", done: doneChoice, Icon: CheckIcon },
    ];
  }, [setupNeeded, shortlistIds.length, hasCompleteShortlist, plannedCount, hasAttended, hasRatedVisit, hasVisitNotes]);

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
              <h1 className="text-xl font-serif font-semibold text-foreground">
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
                <span className={`mt-1 inline-flex items-center gap-1 ${badgeSecondary}`}>
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
          {(() => {
            const suggestions = [
              {
                show: shortlistIds.length === 0,
                title: t(language, "profile.next_step_discover_title"),
                body: t(language, "profile.next_step_discover_body"),
                cta: t(language, "profile.next_step_discover_cta"),
                href: "/",
              },
              {
                show: !hasCompleteShortlist,
                title: t(language, "profile.next_step_finish_title"),
                body: t(language, "profile.next_step_finish_body").replace("{cap}", String(shortlistRankCapForLevels(workspace?.advies_levels ?? []))),
                cta: t(language, "profile.next_step_finish_cta"),
                href: "/",
              },
              {
                show: plannedCount === 0,
                title: t(language, "profile.next_step_plan_title"),
                body: t(language, "profile.next_step_plan_body"),
                cta: t(language, "profile.next_step_plan_cta"),
                href: "/planner",
              },
              {
                show: !(hasAttended && hasRatedVisit && hasVisitNotes),
                title: t(language, "profile.next_step_visit_title"),
                body: t(language, "profile.next_step_visit_body"),
                cta: t(language, "profile.next_step_visit_cta"),
                href: "/shortlist",
              },
            ].filter((item) => item.show);

            if (suggestions.length === 0) {
              return (
                <div className="text-center text-sm text-muted-foreground">
                  {t(language, "profile.list_count").replace("{count}", String(shortlistIds.length))}
                </div>
              );
            }

            return (
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t(language, "profile.next_step")}
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-foreground">{suggestions[0].title}</div>
                  <p className="text-sm text-muted-foreground">{suggestions[0].body}</p>
                  <Link
                    href={suggestions[0].href}
                    className={buttonOutlinePill}
                  >
                    {suggestions[0].cta}
                  </Link>
                </div>
              </div>
            );
          })()}
          <div className="relative mt-4">
            <div className="absolute left-[10%] right-[10%] top-5 h-0.5 bg-border" />
            <div className="absolute left-[10%] right-[10%] top-5 h-0.5 overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ transform: `scaleX(${Math.min(1, journeyProgress.pct / 100)})`, transformOrigin: "left" }}
              />
            </div>
            <div className="grid grid-cols-5">
              {journeySteps.map((step) => {
                const DoneIcon = step.Icon;
                const done = step.done;
                return (
                  <div key={step.key} className="flex w-full flex-col items-center gap-2">
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

        <section className="flex flex-col gap-3 sm:flex-row">
          <Link href="/shortlist" className={`${buttonOutline} w-full sm:flex-1`}>
            <span className="inline-flex items-center gap-2">
              <HeartIcon />
              {t(language, "profile.cta_my_list")}
            </span>
          </Link>
          <Link href="/planner" className={`${buttonOutline} w-full sm:flex-1`}>
            <span className="inline-flex items-center gap-2">
              <CalendarIcon />
              {t(language, "profile.cta_open_days")}
            </span>
          </Link>
        </section>

        {setupNeeded && (
          <InfoCard title={t(language, "dashboard.finish_setup")}>
            <div className="text-sm text-muted-foreground">
              {t(language, "dashboard.finish_setup_body")}
            </div>
            <Link className={buttonOutline} href="/settings">
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
              label: t(language, "profile.link_release_notes"),
              description: t(language, "profile.desc_release_notes"),
              action: () => router.push("/release-notes"),
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
