"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { friendlyLevel, shortlistRankCapForLevels } from "@/lib/levels";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { InfoCard, Wordmark } from "@/components/schoolkeuze";

type Workspace = {
    id: string;
    advies_levels: string[];
    advies_match_mode: "either" | "both";
    home_postcode?: string | null;
    home_house_number?: string | null;
    language?: Language | null;
};

type WorkspaceRow = {
    id: string;
    advies_levels: string[];
    advies_match_mode: "either" | "both";
    home_postcode?: string | null;
    home_house_number?: string | null;
    language?: Language | null;
};

type VisitRow = {
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

type SortMode = "name" | "bike";

const SCHOOL_IMAGES = [
    "/branding/hero/school-1.jpg",
    "/branding/hero/school-2.jpg",
    "/branding/hero/school-3.jpg",
    "/branding/hero/school-4.jpg",
];

function pickSchoolImage(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) {
        hash = (hash + id.charCodeAt(i) * (i + 1)) % SCHOOL_IMAGES.length;
    }
    return SCHOOL_IMAGES[hash] ?? SCHOOL_IMAGES[0];
}

function matchesAdvies(
    schoolLevels: string[],
    adviesLevels: string[],
    matchMode: "either" | "both"
) {
    const a = (adviesLevels || []).filter(Boolean);
    if (a.length === 0) return true; // no advies set => show all
    if (a.length === 1) return schoolLevels.includes(a[0]);
    // combined advice
    if (matchMode === "both") return a.every((lvl) => schoolLevels.includes(lvl));
    return a.some((lvl) => schoolLevels.includes(lvl));
}

export default function SchoolsPage() {
    const [loading, setLoading] = useState(true);
    const [ws, setWs] = useState<Workspace | null>(null);
    const [schools, setSchools] = useState<School[]>([]);
    const [query, setQuery] = useState("");
    const [sortMode, setSortMode] = useState<SortMode>(() => {
        if (typeof window === "undefined") return "name";
        const stored = window.localStorage.getItem("schools_sort_mode");
        return stored === "name" || stored === "bike" ? stored : "name";
    });
    const [error, setError] = useState("");
    const [shortlistMsg, setShortlistMsg] = useState<string>("");
    const [shortlistBusyId, setShortlistBusyId] = useState<string>("");
    const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("schools_sort_mode", sortMode);
    }, [sortMode]);

    useEffect(() => {
        let mounted = true;

        async function load() {
            setLoading(true);
            setError("");

            const { data: session } = await supabase.auth.getSession();
            if (!session.session) {
                setError("Not signed in.");
                setLoading(false);
                return;
            }

            const { workspace, error: wErr } = await fetchCurrentWorkspace<WorkspaceRow>(
                "id,advies_levels,advies_match_mode,home_postcode,home_house_number,language"
            );

            if (!mounted) return;

            if (wErr) {
                setError(wErr);
                setLoading(false);
                return;
            }

            const workspaceRow = (workspace ?? null) as WorkspaceRow | null;
            setWs(workspaceRow);
            setLanguage((workspaceRow?.language as Language) ?? readStoredLanguage());

            const { data: schoolsData, error: sErr } = await supabase
                .from("schools")
                .select("id,name,supported_levels,address,website_url,visits(id,workspace_id,attended,rating_stars)")
                .order("name", { ascending: true });

            if (!mounted) return;

            if (sErr) {
                setError(sErr.message);
                setLoading(false);
                return;
            }

            const schoolList = (schoolsData ?? []) as SchoolRow[];

            // Fetch commute cache for this workspace (if available)
            const commuteMap = new Map<string, { duration_minutes: number | null; distance_km: number }>();
            let openDaySchoolIds = new Set<string>();
            let plannedSchoolIds = new Set<string>();

            if (workspaceRow?.id) {
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

                const { data: openDays, error: oErr } = await supabase
                    .from("open_days")
                    .select("school_id,school_year_label,is_active");

                if (!mounted) return;
                if (oErr) {
                    setError(oErr.message);
                    setLoading(false);
                    return;
                }

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

                const { data: plannedRows, error: pErr } = await supabase
                    .from("planned_open_days")
                    .select("open_day:open_days(school_id,school_year_label)")
                    .eq("workspace_id", workspaceRow.id);

                if (!mounted) return;
                if (pErr) {
                    setError(pErr.message);
                    setLoading(false);
                    return;
                }

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

            const workspaceId = (workspaceRow as WorkspaceRow).id;
            const merged = schoolList.map((s) => ({
                ...s,
                commute: commuteMap.get(s.id) ?? null,
                visits: s.visits?.filter((v) => v.workspace_id === workspaceId) ?? s.visits ?? null,
                has_open_day: openDaySchoolIds.has(s.id),
                has_planned_open_day: plannedSchoolIds.has(s.id),
            }));

            setSchools(merged);
            setLoading(false);
        }

        load();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        function onLang(e: Event) {
            const next = (e as CustomEvent<Language>).detail;
            if (next) setLanguage(next);
        }
        window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
        return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
    }, []);

    // Commutes are precomputed on Settings save; avoid background refresh here.

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const adviesLevels = ws?.advies_levels ?? [];
        const matchMode = ws?.advies_match_mode ?? "either";

        return schools
            .filter((s) => (q ? s.name.toLowerCase().includes(q) : true))
            .filter((s) => matchesAdvies(s.supported_levels ?? [], adviesLevels, matchMode));
    }, [schools, query, ws]);

    const sorted = useMemo(() => {
        if (sortMode === "name") {
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
    }, [filtered, sortMode]);

    const hasMissingCommutes = useMemo(
        () => schools.some((s) => s.commute?.duration_minutes == null),
        [schools]
    );

    async function addSchoolToShortlist(schoolId: string) {
        if (!ws) return;

        setError("");
        setShortlistMsg("");
        setShortlistBusyId(schoolId);

        // Ensure shortlist exists
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

        // Load existing items to find an empty rank
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
            list
                .map((x) => x.rank)
                .filter((r): r is number => typeof r === "number")
        );
        let rank: number | null = null;
        const cap = shortlistRankCapForLevels(ws?.advies_levels ?? []);
        for (let r = 1; r <= cap; r++) {
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
            setShortlistMsg(
                t(language, "schools.shortlist_added_ranked").replace("#{rank}", String(rank))
            );
        } else setShortlistMsg(t(language, "schools.shortlist_added_unranked"));

        setShortlistBusyId("");
    }

    return (
        <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-5xl space-y-6">
                <header className="flex flex-col gap-3">
                    <Wordmark />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="font-serif text-3xl font-semibold text-foreground">
                                {t(language, "schools.title")}
                            </h1>
                            <div className="text-sm text-muted-foreground">
                                {t(language, "schools.count").replace("#{count}", String(sorted.length))}
                            </div>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                            {t(language, "schools.filters_advies")}{" "}
                            {(ws?.advies_levels ?? []).length
                                ? (ws?.advies_levels ?? []).join(" / ")
                                : "—"}
                            {(ws?.advies_levels?.length ?? 0) === 2 && (
                                <span className="text-[11px] text-muted-foreground">
                                    ({ws?.advies_match_mode})
                                </span>
                            )}
                        </span>
                    </div>
                </header>

                {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

                {!loading && error && <p className="text-sm text-red-600">Error: {error}</p>}

                {!loading && !error && (
                    <div className="space-y-5">
                        <InfoCard title={t(language, "schools.filters_title")}>
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="text-sm font-medium text-muted-foreground">
                                        {t(language, "schools.sort")}
                                    </label>
                                    <select
                                        className="rounded-full border bg-background px-4 py-2 text-sm"
                                        value={sortMode}
                                        onChange={(e) => setSortMode(e.target.value as SortMode)}
                                    >
                                        <option value="name">{t(language, "schools.sort_name")}</option>
                                        <option value="bike">{t(language, "schools.sort_bike")}</option>
                                    </select>
                                    {sortMode === "bike" ? (
                                        <span className="text-xs text-muted-foreground">
                                            {!ws?.home_postcode || !ws?.home_house_number
                                                ? t(language, "schools.bike_missing_address")
                                                : hasMissingCommutes
                                                ? t(language, "schools.bike_missing_some")
                                                : null}
                                        </span>
                                    ) : null}
                                </div>

                                <input
                                    className="w-full rounded-2xl border bg-background px-4 py-3 text-sm"
                                    placeholder={t(language, "schools.search")}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>
                        </InfoCard>

                        {shortlistMsg && (
                            <div className="rounded-2xl border border-info-muted bg-info-muted px-4 py-3 text-sm text-foreground">
                                {shortlistMsg}
                            </div>
                        )}

                        {sorted.length === 0 ? (
                            <InfoCard title={t(language, "schools.no_matches_title")}>
                                <p className="text-sm text-muted-foreground">
                                    {t(language, "schools.no_matches_body")}
                                </p>
                            </InfoCard>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {sorted.map((s) => {
                                    const levelLabel =
                                        (s.supported_levels ?? []).map(friendlyLevel).join(", ") ||
                                        t(language, "schools.levels_empty");
                                    const hasBadges = Boolean(
                                        s.visits?.[0]?.rating_stars || s.visits?.[0]?.attended
                                    );
                                    const image = pickSchoolImage(s.id);
                                    return (
                                        <div
                                            key={s.id}
                                            className="flex flex-col overflow-hidden rounded-3xl border bg-card shadow-md"
                                        >
                                            <Link href={`/schools/${s.id}`} className="block">
                                                <div className="relative h-40 overflow-hidden">
                                                    <img
                                                        src={image}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                            </Link>
                                            <div className="space-y-3 p-4">
                                                <div className="space-y-1">
                                                    <Link
                                                        className="text-base font-semibold text-primary underline underline-offset-2"
                                                        href={`/schools/${s.id}`}
                                                    >
                                                        {s.name}
                                                    </Link>
                                                    <div className="text-sm text-muted-foreground">{levelLabel}</div>
                                                </div>

                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    {(s.supported_levels ?? []).slice(0, 3).map((lvl) => (
                                                        <span
                                                            key={lvl}
                                                            className="rounded-full bg-secondary/70 px-3 py-1 font-semibold text-foreground"
                                                        >
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
                                                        <span>
                                                            🚲 {s.commute.duration_minutes} min • {s.commute.distance_km} km
                                                        </span>
                                                    ) : null}
                                                    {s.address ? <span>{s.address}</span> : null}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-4">
                                                    {s.website_url ? (
                                                        <a
                                                            className="text-sm text-muted-foreground underline"
                                                            href={s.website_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            {t(language, "schools.website")}
                                                        </a>
                                                    ) : null}
                                                    <button
                                                        className="ml-auto rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
                                                        onClick={() => addSchoolToShortlist(s.id)}
                                                        disabled={shortlistBusyId === s.id}
                                                    >
                                                        {shortlistBusyId === s.id
                                                            ? t(language, "schools.shortlist_adding")
                                                            : t(language, "schools.shortlist_add")}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
