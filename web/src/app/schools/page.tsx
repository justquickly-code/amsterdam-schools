"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Workspace = {
    id: string;
    advies_levels: string[];
    advies_match_mode: "either" | "both";
    home_postcode?: string | null;
    home_house_number?: string | null;
};

type WorkspaceRow = {
    id: string;
    advies_levels: string[];
    advies_match_mode: "either" | "both";
    home_postcode?: string | null;
    home_house_number?: string | null;
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
    const autoComputeDone = useRef(false);

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

            const { data: workspace, error: wErr } = await supabase
                .from("workspaces")
                .select("id,advies_levels,advies_match_mode,home_postcode,home_house_number")
                .limit(1)
                .maybeSingle();

            if (!mounted) return;

            if (wErr) {
                setError(wErr.message);
                setLoading(false);
                return;
            }

            const workspaceRow = (workspace ?? null) as WorkspaceRow | null;
            setWs(workspaceRow);

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
            }

            const workspaceId = (workspaceRow as WorkspaceRow).id;
            const merged = schoolList.map((s) => ({
                ...s,
                commute: commuteMap.get(s.id) ?? null,
                visits: s.visits?.filter((v) => v.workspace_id === workspaceId) ?? s.visits ?? null,
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
        if (loading || autoComputeDone.current) return;
        if (!ws?.id) return;
        if (!ws.home_postcode || !ws.home_house_number) return;

        const missingIds = schools
            .filter((s) => s.commute?.duration_minutes == null)
            .map((s) => s.id);

        if (missingIds.length === 0) return;

        autoComputeDone.current = true;

        (async () => {
            const { data: session } = await supabase.auth.getSession();
            const token = session.session?.access_token ?? "";
            if (!token) return;

            await fetch("/api/commutes/compute", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    workspace_id: ws.id,
                    school_ids: missingIds.slice(0, 20),
                    limit: 10,
                }),
            });

            const { data: commutes } = await supabase
                .from("commute_cache")
                .select("school_id,duration_minutes,distance_km")
                .eq("workspace_id", ws.id)
                .eq("mode", "bike");

            const commuteRows = (commutes ?? []) as CommuteCacheRow[];
            const commuteMap = new Map<string, { duration_minutes: number | null; distance_km: number }>();
            for (const c of commuteRows) {
                commuteMap.set(c.school_id, {
                    duration_minutes: c.duration_minutes,
                    distance_km: Number(c.distance_km),
                });
            }

            setSchools((prev) =>
                prev.map((s) => ({
                    ...s,
                    commute: commuteMap.get(s.id) ?? null,
                }))
            );
        })().catch(() => null);
    }, [loading, schools, ws]);

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
                    <h1 className="text-2xl font-semibold">Schools</h1>
                    <div className="flex gap-3">
                        <Link className="text-sm underline" href="/settings">
                            Settings
                        </Link>
                        <Link className="text-sm underline" href="/">
                            Home
                        </Link>
                    </div>
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
                            <label className="text-sm text-muted-foreground">Sort</label>
                            <select
                                className="rounded-md border px-2 py-1 text-sm"
                                value={sortMode}
                                onChange={(e) => setSortMode(e.target.value as SortMode)}
                            >
                                <option value="name">Name</option>
                                <option value="bike">Bike time</option>
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
                            placeholder="Search schools…"
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

                                        <div className="text-sm text-muted-foreground">
                                            {(s.supported_levels ?? []).join(", ") || "levels: —"}
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
