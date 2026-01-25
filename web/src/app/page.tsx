"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ADVIES_OPTIONS, friendlyLevel } from "@/lib/levels";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { Language, LANGUAGE_EVENT, emitLanguageChanged, readStoredLanguage, setStoredLanguage, t } from "@/lib/i18n";
import { schoolImageForName } from "@/lib/schoolImages";
import { InfoCard, Wordmark } from "@/components/schoolkeuze";

const FALLBACK_IMAGES = [
  "/branding/hero/school-1.jpg",
  "/branding/hero/school-2.jpg",
  "/branding/hero/school-3.jpg",
  "/branding/hero/school-4.jpg",
];

function pickSchoolImage(name: string, fallbackKey?: string) {
  const mapped = schoolImageForName(name);
  if (mapped) return mapped;
  const key = fallbackKey ?? name;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash + key.charCodeAt(i) * (i + 1)) % FALLBACK_IMAGES.length;
  }
  return FALLBACK_IMAGES[hash] ?? FALLBACK_IMAGES[0];
}

type WorkspaceRow = {
  id: string;
  advies_levels: string[];
  advies_match_mode: "either" | "both";
  home_postcode?: string | null;
  home_house_number?: string | null;
  language?: Language | null;
};

type VisitRow = {
  school_id: string;
  workspace_id: string;
  attended: boolean;
  rating_stars: number | null;
};

type SchoolRow = {
  id: string;
  name: string;
  supported_levels: string[];
  address: string | null;
  website_url: string | null;
  image_url?: string | null;
  visits?: VisitRow[] | null;
};

type CommuteCacheRow = {
  school_id: string;
  duration_minutes: number | null;
  distance_km: number | null;
};

type ShortlistRow = {
  id: string;
};

type ShortlistItemRow = {
  rank: number | null;
  school_id: string;
};

type OpenDayRow = {
  school_id: string | null;
  school_year_label: string | null;
  is_active?: boolean;
};

type PlannedOpenDayRow = {
  open_day?: { school_id: string | null; school_year_label: string | null }[] | { school_id: string | null; school_year_label: string | null } | null;
};

type School = {
  id: string;
  name: string;
  supported_levels: string[];
  address: string | null;
  website_url: string | null;
  commute?: {
    duration_minutes: number | null;
    distance_km: number;
  } | null;
  visits?: Array<{
    attended: boolean;
    rating_stars: number | null;
  }> | null;
  has_open_day?: boolean;
  has_planned_open_day?: boolean;
};

type FeaturedSchool = {
  id: string;
  name: string;
  image: string;
  tags: string[];
  address: string;
  commute: School["commute"];
  rating: number | null;
};

type SortMode = "name" | "bike";

function matchesAdvies(
  schoolLevels: string[],
  adviesLevels: string[],
  matchMode: "either" | "both"
) {
  const a = (adviesLevels || []).filter(Boolean);
  if (a.length === 0) return true; // no advies set => show all
  if (a.length === 1) return schoolLevels.includes(a[0]);
  if (matchMode === "both") return a.every((lvl) => schoolLevels.includes(lvl));
  return a.some((lvl) => schoolLevels.includes(lvl));
}

function levelsForAdviesKey(key: string) {
  return ADVIES_OPTIONS.find((opt) => opt.key === key)?.levels ?? [];
}

export default function ExploreHome() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("nl");
  const [hydrated, setHydrated] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [searchStarted, setSearchStarted] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [postcode, setPostcode] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("prefill_postcode") ?? "";
  });
  const [adviesKey, setAdviesKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("prefill_advies") ?? "";
  });
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState<WorkspaceRow | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [error, setError] = useState("");
  const [shortlistMsg, setShortlistMsg] = useState<string>("");
  const [shortlistBusyId, setShortlistBusyId] = useState<string>("");

  useEffect(() => {
    setHydrated(true);
    setLanguage(readStoredLanguage());
    const onLang = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next) setLanguage(next);
    };
    window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("prefill_postcode", postcode);
  }, [postcode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("prefill_advies", adviesKey);
  }, [adviesKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("schools_sort_mode");
    if (stored === "name" || stored === "bike") {
      setSortMode(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("schools_sort_mode", sortMode);
  }, [sortMode]);

  const toggleLanguage = async () => {
    const next = language === "nl" ? "en" : "nl";
    if (hasSession && ws?.id) {
      await supabase.from("workspaces").update({ language: next }).eq("id", ws.id);
    }
    setLanguage(next);
    if (typeof window !== "undefined") {
      setStoredLanguage(next);
      emitLanguageChanged(next);
    }
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      const { data: session } = await supabase.auth.getSession();
      const authed = Boolean(session.session);
      setHasSession(authed);

      let workspaceRow: WorkspaceRow | null = null;
      if (authed) {
        const { workspace, error: wErr } = await fetchCurrentWorkspace<WorkspaceRow>(
          "id,advies_levels,advies_match_mode,home_postcode,home_house_number,language"
        );
        if (!mounted) return;
        if (wErr) {
          setError(wErr);
          setLoading(false);
          return;
        }
        workspaceRow = (workspace ?? null) as WorkspaceRow | null;
        setWs(workspaceRow);
        const storedLang = readStoredLanguage();
        const wsLang = (workspaceRow?.language as Language | null) ?? null;
        if (storedLang && storedLang !== wsLang && workspaceRow?.id) {
          await supabase.from("workspaces").update({ language: storedLang }).eq("id", workspaceRow.id);
          setLanguage(storedLang);
        } else {
          setLanguage(wsLang ?? storedLang);
        }
        if ((workspaceRow?.advies_levels ?? []).length > 0) {
          const key = ADVIES_OPTIONS.find((opt) => {
            const levels = opt.levels.join("|");
            return levels === (workspaceRow?.advies_levels ?? []).join("|");
          })?.key;
          if (key) setAdviesKey(key);
        }
        if (workspaceRow?.home_postcode && workspaceRow?.home_house_number) {
          const storedSort = typeof window !== "undefined" ? window.localStorage.getItem("schools_sort_mode") : null;
          if (!storedSort || storedSort === "name") {
            setSortMode("bike");
          }
        }
      } else {
        setWs(null);
      }

      let schoolsData: unknown;
      let sErr: { message: string } | null = null;
      if (authed) {
        const { data, error } = await supabase
          .from("schools")
          .select("id,name,supported_levels,address,website_url,image_url")
          .order("name", { ascending: true });
        schoolsData = data;
        sErr = error;
      } else {
        const { data, error } = await supabase
          .from("schools")
          .select("id,name,supported_levels,address,website_url,image_url")
          .order("name", { ascending: true });
        schoolsData = data;
        sErr = error;
      }

      if (!mounted) return;

      if (sErr) {
        setError(sErr.message);
        setLoading(false);
        return;
      }

      const schoolList = (schoolsData ?? []) as SchoolRow[];
      const commuteMap = new Map<string, { duration_minutes: number | null; distance_km: number }>();
      const visitsMap = new Map<string, VisitRow[]>();
      let openDaySchoolIds = new Set<string>();
      let plannedSchoolIds = new Set<string>();

      if (authed && workspaceRow?.id) {
        const { data: commutes } = await supabase
          .from("commute_cache")
          .select("school_id,duration_minutes,distance_km")
          .eq("workspace_id", workspaceRow.id)
          .eq("mode", "bike");

        const commuteRows = (commutes ?? []) as CommuteCacheRow[];
        for (const c of commuteRows) {
          commuteMap.set(c.school_id, {
            duration_minutes: c.duration_minutes,
            distance_km: Number(c.distance_km),
          });
        }

        const { data: visitRows } = await supabase
          .from("visits")
          .select("school_id,workspace_id,attended,rating_stars")
          .eq("workspace_id", workspaceRow.id);

        const visits = (visitRows ?? []) as VisitRow[];
        for (const v of visits) {
          const list = visitsMap.get(v.school_id) ?? [];
          list.push(v);
          visitsMap.set(v.school_id, list);
        }

        const { data: openDays } = await supabase
          .from("open_days")
          .select("school_id,school_year_label,is_active");

        const openDayRows = (openDays ?? []) as OpenDayRow[];
        let latestYearLabel: string | null = null;
        let latestYear = 0;
        for (const row of openDayRows) {
          const label = row.school_year_label ?? "";
          const year = Number.parseInt(label.split("/")[0] ?? "0", 10);
          if (year > latestYear) {
            latestYear = year;
            latestYearLabel = label;
          }
        }

        if (latestYearLabel) {
          openDaySchoolIds = new Set(
            openDayRows
              .filter((row) => row.is_active !== false)
              .filter((row) => row.school_year_label === latestYearLabel)
              .map((row) => row.school_id ?? "")
              .filter(Boolean)
          );
        }

        const { data: plannedRows } = await supabase
          .from("planned_open_days")
          .select("open_day:open_days(school_id,school_year_label)")
          .eq("workspace_id", workspaceRow.id);

        const plannedList = (plannedRows ?? []) as PlannedOpenDayRow[];
        plannedSchoolIds = new Set(
          plannedList
            .map((row) => {
              const val = row.open_day ?? null;
              if (Array.isArray(val)) return val[0] ?? null;
              return val;
            })
            .filter(Boolean)
            .filter((row) => row?.school_year_label === latestYearLabel)
            .map((row) => row?.school_id ?? "")
            .filter(Boolean)
        );
      }

      const merged = schoolList.map((s) => ({
        ...s,
        commute: commuteMap.get(s.id) ?? null,
        visits: authed ? visitsMap.get(s.id) ?? null : null,
        has_open_day: authed ? openDaySchoolIds.has(s.id) : false,
        has_planned_open_day: authed ? plannedSchoolIds.has(s.id) : false,
      }));

      setSchools(merged as School[]);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [adviesKey]);

  const sectionTitle = searchStarted ? t(language, "explore.nearby") : t(language, "explore.popular");

  const toggleFavorite = (id: string) => {
    if (!hasSession) {
      router.push("/login");
      return;
    }
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const activeAdviesLevels = useMemo(
    () => (adviesKey ? levelsForAdviesKey(adviesKey) : ws?.advies_levels ?? []),
    [adviesKey, ws]
  );
  const matchMode = ws?.advies_match_mode ?? "either";

  const filtered = useMemo(() => {
    const q = hasSession ? query.trim().toLowerCase() : "";
    return schools
      .filter((s) => (q ? s.name.toLowerCase().includes(q) : true))
      .filter((s) => matchesAdvies(s.supported_levels ?? [], activeAdviesLevels, matchMode));
  }, [schools, query, activeAdviesLevels, matchMode, hasSession]);

  const sorted = useMemo(() => {
    if (!hasSession || sortMode === "name") {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    const withCommute = [...filtered].filter((s) => s.commute?.duration_minutes != null);
    const withoutCommute = [...filtered].filter((s) => s.commute?.duration_minutes == null);
    withCommute.sort(
      (a, b) =>
        (a.commute?.duration_minutes ?? Number.POSITIVE_INFINITY) -
        (b.commute?.duration_minutes ?? Number.POSITIVE_INFINITY)
    );
    return withCommute.concat(withoutCommute);
  }, [filtered, sortMode, hasSession]);

  const featuredSchools = useMemo<FeaturedSchool[]>(() => {
    if (sorted.length === 0) return [];
    const base =
      hasSession
        ? sorted
        : searchStarted
          ? sorted
          : [...schools].sort((a, b) => {
              const seed = "public-hero";
              const hash = (value: string) => {
                let acc = 0;
                for (let i = 0; i < value.length; i += 1) {
                  acc = (acc * 31 + value.charCodeAt(i)) % 100000;
                }
                return acc;
              };
              return hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`);
            });

    return base.slice(0, hasSession ? 4 : 5).map((s) => ({
      id: s.id,
      name: s.name,
      image: s.image_url || pickSchoolImage(s.name, s.id),
      tags: (s.supported_levels ?? []).slice(0, 2).map(friendlyLevel),
      address: s.address ?? "",
      commute: s.commute ?? null,
      rating: s.visits?.[0]?.rating_stars ?? null,
    }));
  }, [sorted, schools, hasSession, searchStarted]);

  async function addSchoolToShortlist(schoolId: string) {
    if (!hasSession) {
      router.push("/login");
      return;
    }
    if (!ws) return;

    setError("");
    setShortlistMsg("");
    setShortlistBusyId(schoolId);

    const { data: existing, error: sErr } = await supabase
      .from("shortlists")
      .select("id")
      .eq("workspace_id", ws.id)
      .maybeSingle();

    if (sErr && sErr.code !== "PGRST116") {
      setError(sErr.message);
      setShortlistBusyId("");
      return;
    }

    const existingRow = (existing ?? null) as ShortlistRow | null;
    let shortlistId = existingRow?.id as string | undefined;

    if (!shortlistId) {
      const { data: created, error: cErr } = await supabase
        .from("shortlists")
        .insert({ workspace_id: ws.id })
        .select("id")
        .maybeSingle();

      if (cErr || !created) {
        setError(cErr?.message ?? "Could not create shortlist.");
        setShortlistBusyId("");
        return;
      }
      shortlistId = (created as ShortlistRow).id;
    }

    const { data: items, error: iErr } = await supabase
      .from("shortlist_items")
      .select("rank,school_id")
      .eq("shortlist_id", shortlistId);

    if (iErr) {
      setError(iErr.message);
      setShortlistBusyId("");
      return;
    }

    const list = (items ?? []) as ShortlistItemRow[];
    const already = list.some((x) => x.school_id === schoolId);
    if (already) {
      setShortlistMsg(t(language, "schools.shortlist_already"));
      setShortlistBusyId("");
      return;
    }

    const taken = new Set<number>(
      list.map((x) => x.rank).filter((r): r is number => typeof r === "number")
    );
    let rank: number | null = null;
    for (let r = 1; r <= 12; r++) {
      if (!taken.has(r)) {
        rank = r;
        break;
      }
    }

    const { error: insErr } = await supabase.from("shortlist_items").insert({
      shortlist_id: shortlistId,
      school_id: schoolId,
      rank,
    });

    if (insErr) setError(insErr.message);
    else if (rank) {
      setShortlistMsg(t(language, "schools.shortlist_added_ranked").replace("#{rank}", String(rank)));
    } else setShortlistMsg(t(language, "schools.shortlist_added_unranked"));

    setShortlistBusyId("");
  }

  return (
    <main className="min-h-screen pb-24">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/branding/hero/hero-bg.jpg" alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
        </div>
        <div className="relative px-5 pt-6 pb-12">
          <div className="flex items-center justify-between">
            <Wordmark variant="white" />
            {hydrated ? (
              <button
                className="rounded-full border border-white/40 bg-white/90 px-4 py-2 text-xs font-semibold text-foreground shadow-sm md:hidden"
                type="button"
                onClick={toggleLanguage}
              >
                {language === "nl" ? "NL" : "EN"}
              </button>
            ) : null}
          </div>

          <div className="mt-10 max-w-xl">
            <h1 className="font-serif text-3xl font-semibold text-white drop-shadow-sm sm:text-4xl">
              {t(language, "explore.hero_title")}
            </h1>
            <p className="mt-3 text-base text-white/90">{t(language, "explore.hero_subtitle")}</p>
          </div>

          <div className="mt-8 rounded-3xl border border-white/30 bg-white/95 p-4 shadow-lg backdrop-blur">
            {hasSession ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="flex flex-col gap-2 text-xs font-semibold text-muted-foreground">
                  {t(language, "schools.sort")}
                  <select
                    className="h-11 rounded-2xl border bg-white px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary"
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                  >
                    <option value="name">{t(language, "schools.sort_name")}</option>
                    <option value="bike">{t(language, "schools.sort_bike")}</option>
                  </select>
                </label>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[1.1fr_1fr_auto]">
                <label className="flex flex-col gap-2 text-xs font-semibold text-muted-foreground">
                  {t(language, "explore.search_postcode")}
                  <input
                    className="h-11 rounded-2xl border bg-white px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary"
                    placeholder="1011 AB"
                    value={postcode}
                    onChange={(event) => setPostcode(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs font-semibold text-muted-foreground">
                  {t(language, "explore.search_advice")}
                  <select
                    className="h-11 rounded-2xl border bg-white px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary"
                    value={adviesKey}
                    onChange={(event) => setAdviesKey(event.target.value)}
                  >
                    <option value="">{t(language, "settings.advies_select")}</option>
                    {ADVIES_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="h-11 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
                  type="button"
                  onClick={() => setSearchStarted(true)}
                >
                  {t(language, "explore.search_cta")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="px-5 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-foreground">{sectionTitle}</h2>
          <Link
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
            href="/login"
          >
            {t(language, "explore.cta_start_list")}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {featuredSchools.map((school, idx) => {
            const isFavorite = favorites.includes(school.id);
            const hasLink = "address" in school;
            const schoolHref = hasLink ? `/schools/${school.id}` : "#school-list";
            return (
              <div key={school.id} className="overflow-hidden rounded-3xl border bg-card shadow-md">
                <div className="relative h-40">
                  {hasLink ? (
                    <Link href={schoolHref} className="absolute inset-0">
                      <Image src={school.image} alt={school.name} fill className="object-cover" />
                    </Link>
                  ) : (
                    <Image src={school.image} alt={school.name} fill className="object-cover" />
                  )}
                  <button
                    className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-base shadow-sm transition ${
                      isFavorite ? "bg-primary text-primary-foreground" : "bg-white/90 text-foreground"
                    }`}
                    onClick={() => toggleFavorite(school.id)}
                    type="button"
                    aria-label="Toggle favorite"
                  >
                    {isFavorite ? "♥" : "♡"}
                  </button>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    {hasLink ? (
                      <Link className="text-base font-semibold text-primary underline underline-offset-2" href={schoolHref}>
                        {school.name}
                      </Link>
                    ) : (
                      <h3 className="text-base font-semibold text-foreground">{school.name}</h3>
                    )}
                    {"address" in school && school.address ? (
                      <div className="mt-1 text-xs text-muted-foreground">{school.address}</div>
                    ) : null}
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {"commute" in school && school.commute?.duration_minutes ? (
                        <span>🚲 {school.commute.duration_minutes} min</span>
                      ) : null}
                      {"commute" in school && school.commute?.distance_km ? (
                        <span>{school.commute.distance_km} km</span>
                      ) : null}
                      {"rating" in school && school.rating ? <span>⭐ {school.rating}/5</span> : null}
                    </div>
                  </div>
                  {"tags" in school && school.tags?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {school.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-secondary/70 px-3 py-1 text-xs font-semibold text-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="school-list" className="bg-background px-5 pb-12">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {hasSession ? (
            <InfoCard
              title={t(language, "schools.filters_title")}
              action={activeAdviesLevels.length ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                  {t(language, "schools.filters_advies")} {activeAdviesLevels.join(" / ")}
                </span>
              ) : undefined}
            >
              <input
                className="w-full rounded-2xl border bg-background px-4 py-3 text-sm"
                placeholder={t(language, "schools.search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </InfoCard>
          ) : null}

          {shortlistMsg && (
            <div className="rounded-2xl border border-info-muted bg-info-muted px-4 py-3 text-sm text-foreground">
              {shortlistMsg}
            </div>
          )}

          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && error && <p className="text-sm text-red-600">Error: {error}</p>}

          {!loading && !error && sorted.length === 0 ? (
            hasSession ? (
              <InfoCard title={t(language, "schools.no_matches_title")}>
                <p className="text-sm text-muted-foreground">{t(language, "schools.no_matches_body")}</p>
              </InfoCard>
            ) : null
          ) : null}

          {!loading && !error && sorted.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {sorted.map((s) => {
                const levelLabel =
                  (s.supported_levels ?? []).map(friendlyLevel).join(", ") ||
                  t(language, "schools.levels_empty");
                const hasBadges = Boolean(s.visits?.[0]?.rating_stars || s.visits?.[0]?.attended);
                const image = s.image_url || pickSchoolImage(s.name, s.id);
                return (
                  <div key={s.id} className="flex flex-col overflow-hidden rounded-3xl border bg-card shadow-md">
                    <Link href={`/schools/${s.id}`} className="block">
                      <div className="relative h-40 overflow-hidden">
                        <Image
                          src={image}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover"
                        />
                      </div>
                    </Link>
                    <div className="space-y-3 p-4">
                      <div className="space-y-1">
                        <Link className="text-base font-semibold text-primary underline underline-offset-2" href={`/schools/${s.id}`}>
                          {s.name}
                        </Link>
                        <div className="text-sm text-muted-foreground">{levelLabel}</div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        {(s.supported_levels ?? []).slice(0, 3).map((lvl) => (
                          <span key={lvl} className="rounded-full bg-secondary/70 px-3 py-1 font-semibold text-foreground">
                            {friendlyLevel(lvl)}
                          </span>
                        ))}
                      </div>

                      {hasBadges ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {s.visits?.[0]?.rating_stars ? (
                            <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold">
                              ★ {s.visits?.[0]?.rating_stars}/5
                            </span>
                          ) : null}
                          {s.visits?.[0]?.attended ? (
                            <span className="rounded-full border px-2 py-0.5">
                              {t(language, "schools.visited")}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {s.commute ? (
                          <span>🚲 {s.commute.duration_minutes} min • {s.commute.distance_km} km</span>
                        ) : null}
                        {s.address ? <span>{s.address}</span> : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        {s.website_url ? (
                          <a className="text-sm text-muted-foreground underline" href={s.website_url} target="_blank" rel="noreferrer">
                            {t(language, "schools.website")}
                          </a>
                        ) : null}
                        <button
                          className="ml-auto rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
                          onClick={() => addSchoolToShortlist(s.id)}
                          disabled={shortlistBusyId === s.id}
                        >
                          {shortlistBusyId === s.id ? t(language, "schools.shortlist_adding") : t(language, "schools.shortlist_add")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
