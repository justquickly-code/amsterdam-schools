"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { friendlyLevel } from "@/lib/levels";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, t } from "@/lib/i18n";

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
    rank: number;
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
    const [sortMode, setSortMode] = useState<SortMode>("name");
    const [error, setError] = useState("");
    const [shortlistMsg, setShortlistMsg] = useState<string>("");
    const [shortlistBusyId, setShortlistBusyId] = useState<string>("");
    const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

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
            setLanguage((workspaceRow?.language as Language) ?? DEFAULT_LANGUAGE);

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
            setShortlistMsg("Already in shortlist.");
            setShortlistBusyId("");
            return;
        }

        const taken = new Set<number>(list.map((x) => x.rank));
        let rank: number | null = null;
        for (let r = 1; r <= 12; r++) {
            if (!taken.has(r)) {
                rank = r;
                break;
            }
        }

        if (!rank) {
            setError("Shortlist is full (max 12). Remove something first.");
            setShortlistBusyId("");
            return;
        }

        const { error: insErr } = await supabase.from("shortlist_items").insert({
            shortlist_id: shortlistId,
            school_id: schoolId,
            rank,
        });

        if (insErr) setError(insErr.message);
        else setShortlistMsg(`Added to shortlist at #${rank}.`);

        setShortlistBusyId("");
    }

    return (
        <main className="min-h-screen p-6 flex items-start justify-center">
            <div className="w-full max-w-3xl rounded-xl border p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">
                        {t(language, "schools.title")}
                    </h1>
                </div>

                {loading && <p className="text-sm">Loading…</p>}

                {!loading && error && <p className="text-sm text-red-600">Error: {error}</p>}

                {!loading && !error && (
                    <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                            Filtered by advies:{" "}
                            {(ws?.advies_levels ?? []).length
                                ? (ws?.advies_levels ?? []).join(" / ")
                                : "— (not set)"}{" "}
                            {(ws?.advies_levels?.length ?? 0) === 2 && (
                                <span>(match: {ws?.advies_match_mode})</span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="text-sm text-muted-foreground">
                                {t(language, "schools.sort")}
                            </label>
                            <select
                                className="rounded-md border px-2 py-1 text-sm"
                                value={sortMode}
                                onChange={(e) => setSortMode(e.target.value as SortMode)}
                            >
                                <option value="name">
                                    {t(language, "schools.sort_name")}
                                </option>
                                <option value="bike">
                                    {t(language, "schools.sort_bike")}
                                </option>
                            </select>
                        {sortMode === "bike" && (
                            <span className="text-xs text-muted-foreground">
                                Commute times appear first; unknowns are at the bottom.
                                {!ws?.home_postcode || !ws?.home_house_number
                                    ? " Set home address in Settings to compute bike times."
                                    : null}
                            </span>
                        )}
                        </div>

                        <input
                            className="w-full rounded-md border px-3 py-2"
                            placeholder={t(language, "schools.search")}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />

                        {shortlistMsg && (
                            <p className="text-sm text-green-700">{shortlistMsg}</p>
                        )}

                        {sorted.length === 0 ? (
                            <p className="text-sm">No schools match your filters yet.</p>
                        ) : (
                            <ul className="divide-y">
                                {sorted.map((s) => (
                                    <li key={s.id} className="py-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <Link className="font-medium underline" href={`/schools/${s.id}`}>
                                                {s.name}
                                            </Link>

                                            <button
                                                className="rounded-md border px-2 py-1 text-xs"
                                                onClick={() => addSchoolToShortlist(s.id)}
                                                disabled={shortlistBusyId === s.id}
                                            >
                                                {shortlistBusyId === s.id ? "Adding..." : "Add"}
                                            </button>
                                        </div>

                                        {(s.visits?.[0]?.rating_stars || s.visits?.[0]?.attended) && (
                                            <div className="text-sm text-muted-foreground">
                                                {s.visits?.[0]?.rating_stars ? `★ ${s.visits?.[0]?.rating_stars}/5` : ""}
                                                {s.visits?.[0]?.attended ? (
                                                    <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                                                        attended
                                                    </span>
                                                ) : null}
                                            </div>
                                        )}

                                        {s.has_open_day && !s.has_planned_open_day && !s.visits?.[0]?.attended && (
                                            <div className="text-xs text-amber-700">
                                                No planned open day yet
                                            </div>
                                        )}

                                        <div className="text-sm text-muted-foreground">
                                            {(s.supported_levels ?? []).map(friendlyLevel).join(", ") ||
                                                "levels: —"}
                                        </div>

                                        {s.commute && (
                                            <div className="text-sm text-muted-foreground">
                                                🚲 {s.commute.duration_minutes} min • {s.commute.distance_km} km
                                            </div>
                                        )}

                                        {s.address && (
                                            <div className="text-sm text-muted-foreground">{s.address}</div>
                                        )}
                                        {s.website_url && (
                                            <a
                                                className="text-sm underline"
                                                href={s.website_url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Website
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <p className="text-xs text-muted-foreground">
                            Next: we’ll import the real school list and add cycling time/distance.
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
