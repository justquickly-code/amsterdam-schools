"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Workspace = {
    id: string;
    advies_levels: string[];
    advies_match_mode: "either" | "both";
};

type School = {
    id: string;
    name: string;
    supported_levels: string[];
    address: string | null;
    website_url: string | null;
    commute?: {
        duration_minutes: number;
        distance_km: number;
    } | null;
};

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
    const [error, setError] = useState("");

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
                .select("id,advies_levels,advies_match_mode")
                .limit(1)
                .maybeSingle();

            if (!mounted) return;

            if (wErr) {
                setError(wErr.message);
                setLoading(false);
                return;
            }

            setWs(workspace as any);

            const { data: schoolsData, error: sErr } = await supabase
                .from("schools")
                .select("id,name,supported_levels,address,website_url")
                .order("name", { ascending: true });

            if (!mounted) return;

            if (sErr) {
                setError(sErr.message);
                setLoading(false);
                return;
            }

            const schoolList = ((schoolsData as any) ?? []) as School[];

            // Fetch commute cache for this workspace (if available)
            let commuteMap = new Map<string, { duration_minutes: number; distance_km: number }>();

            if (workspace?.id) {
                const { data: commutes } = await supabase
                    .from("commute_cache")
                    .select("school_id,duration_minutes,distance_km")
                    .eq("workspace_id", (workspace as any).id)
                    .eq("mode", "bike");

                for (const c of (commutes as any) ?? []) {
                    commuteMap.set(c.school_id, {
                        duration_minutes: c.duration_minutes,
                        distance_km: Number(c.distance_km),
                    });
                }
            }

            const merged = schoolList.map((s) => ({
                ...s,
                commute: commuteMap.get(s.id) ?? null,
            }));

            setSchools(merged);
            setLoading(false);
        }

        load();
        return () => {
            mounted = false;
        };
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const adviesLevels = ws?.advies_levels ?? [];
        const matchMode = ws?.advies_match_mode ?? "either";

        return schools
            .filter((s) => (q ? s.name.toLowerCase().includes(q) : true))
            .filter((s) => matchesAdvies(s.supported_levels ?? [], adviesLevels, matchMode));
    }, [schools, query, ws]);

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

                        <input
                            className="w-full rounded-md border px-3 py-2"
                            placeholder="Search schools…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />

                        {filtered.length === 0 ? (
                            <p className="text-sm">No schools match your filters yet.</p>
                        ) : (
                            <ul className="divide-y">
                                {filtered.map((s) => (
                                    <li key={s.id} className="py-3">
                                        <Link className="font-medium underline" href={`/schools/${s.id}`}>
                                            {s.name}
                                        </Link>
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