"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Workspace = {
    id: string;
    name: string;
    home_postcode: string | null;
    home_house_number: string | null;
    advies_levels: string[];
    advies_match_mode: "either" | "both";
};

type WorkspaceRow = {
    id: string;
    name: string;
    home_postcode: string | null;
    home_house_number: string | null;
    advies_levels: string[];
    advies_match_mode: "either" | "both";
};

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [error, setError] = useState<string>("");
    const [homePostcode, setHomePostcode] = useState("");
    const [homeHouseNumber, setHomeHouseNumber] = useState("");
    const [advies1, setAdvies1] = useState("");
    const [advies2, setAdvies2] = useState("");
    const [matchMode, setMatchMode] = useState<"either" | "both">("either");
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");
    const [commuteMsg, setCommuteMsg] = useState("");

    function normalizePostcode(input: string) {
        return input.toUpperCase().replace(/\s+/g, "").replace(/[^0-9A-Z]/g, "");
    }

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

            // Default workspace: first workspace (MVP assumes one per user).
            const { data, error } = await supabase
                .from("workspaces")
                .select("id,name,home_postcode,home_house_number,advies_levels,advies_match_mode")
                .limit(1)
                .maybeSingle();

            if (!mounted) return;

            if (error) {
                setError(error.message);
                setWorkspace(null);
            } else {
                const ws = (data ?? null) as WorkspaceRow | null;
                setWorkspace(ws);

                setHomePostcode(ws?.home_postcode ?? "");
                setHomeHouseNumber(ws?.home_house_number ?? "");

                const levels = ws?.advies_levels ?? [];
                setAdvies1(levels?.[0] ?? "");
                setAdvies2(levels?.[1] ?? "");
                setMatchMode(ws?.advies_match_mode ?? "either");
            }

            setLoading(false);
        }

        load();

        return () => {
            mounted = false;
        };
    }, []);

    async function saveSettings() {
        if (!workspace) return;

        setSaving(true);
        setSavedMsg("");
        setError("");

        const postcode = normalizePostcode(homePostcode.trim());
        const house = homeHouseNumber.trim();
        const prevPostcode = normalizePostcode((workspace.home_postcode ?? "").trim());
        const prevHouse = (workspace.home_house_number ?? "").trim();
        const addressChanged = postcode !== prevPostcode || house !== prevHouse;

        // basic validation (MVP)
        if (postcode && !/^\d{4}[A-Z]{2}$/.test(postcode)) {
            setError("Postcode must look like 1234AB.");
            setSaving(false);
            return;
        }
        if ((postcode && !house) || (!postcode && house)) {
            setError("Postcode and house number must be provided together.");
            setSaving(false);
            return;
        }

        const levels = [advies1.trim(), advies2.trim()].filter(Boolean);

        // If only one advies level, force match_mode to either.
        const mode: "either" | "both" = levels.length === 2 ? matchMode : "either";

        setHomePostcode(postcode);

        const { error } = await supabase
            .from("workspaces")
            .update({
                home_postcode: postcode || null,
                home_house_number: house || null,
                ...(addressChanged ? { home_lat: null, home_lng: null } : {}),
                advies_levels: levels,
                advies_match_mode: mode,
            })
            .eq("id", workspace.id);

        if (error) {
            setError(error.message);
        } else {
            setSavedMsg("Saved.");
            setCommuteMsg("");
            // Reload workspace to reflect saved values
            const { data } = await supabase
                .from("workspaces")
                .select("id,name,home_postcode,home_house_number,advies_levels,advies_match_mode")
                .eq("id", workspace.id)
                .maybeSingle();
            setWorkspace((data ?? null) as WorkspaceRow | null);

            if (addressChanged) {
                const { error: delErr } = await supabase
                    .from("commute_cache")
                    .delete()
                    .eq("workspace_id", workspace.id);
                if (delErr) {
                    setCommuteMsg("Could not clear old commutes. Recomputing...");
                }
            }

            if (postcode && house) {
                setCommuteMsg("Updating commute times in the background...");
                (async () => {
                    const { data: session } = await supabase.auth.getSession();
                    const token = session.session?.access_token ?? "";
                    if (!token) return;

                    const { data: schools } = await supabase
                        .from("schools")
                        .select("id,lat,lng")
                        .not("lat", "is", null)
                        .not("lng", "is", null);

                    const { data: existingCommutes } = await supabase
                        .from("commute_cache")
                        .select("school_id")
                        .eq("workspace_id", workspace.id)
                        .eq("mode", "bike");

                    const existingSet = new Set(
                        (existingCommutes ?? []).map((c) => (c as { school_id: string }).school_id)
                    );

                    const schoolIds = (schools ?? [])
                        .map((s) => (s as { id: string }).id)
                        .filter(Boolean)
                        .filter((id) => !existingSet.has(id));

                    if (schoolIds.length === 0) {
                        setCommuteMsg("Commute times are already up to date.");
                        return;
                    }

                    const chunkSize = 20;
                    for (let i = 0; i < schoolIds.length; i += chunkSize) {
                        const chunk = schoolIds.slice(i, i + chunkSize);
                        const res = await fetch("/api/commutes/compute", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                workspace_id: workspace.id,
                                school_ids: chunk,
                                limit: chunk.length,
                                force: addressChanged,
                            }),
                        });
                        const json = await res.json().catch(() => null);
                        if (!res.ok || json?.upsert_failed > 0) {
                            setCommuteMsg(
                                json?.sample_errors?.[0]?.error
                                    ? `Commute update issue: ${json.sample_errors[0].error}`
                                    : "Commute update issue while updating."
                            );
                            return;
                        }
                    }

                    setCommuteMsg("Commute times updated.");
                })().catch(() => null);
            }
        }

        setSaving(false);
    }

    return (
        <main className="min-h-screen p-6 flex items-start justify-center">
            <div className="w-full max-w-xl rounded-xl border p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Settings</h1>
                    <Link className="text-sm underline" href="/">
                        Home
                    </Link>
                </div>

                {loading && <p className="text-sm">Loading…</p>}

                {!loading && error && (
                    <p className="text-sm text-red-600">Error: {error}</p>
                )}

                {!loading && !error && !workspace && (
                    <p className="text-sm">No workspace found.</p>
                )}

                {!loading && workspace && (
                    <div className="space-y-6 text-sm">
                        <div className="space-y-3">
                            <div>
                                <div className="font-medium">Workspace</div>
                                <div>{workspace.name}</div>
                            </div>

                            <div>
                                <div className="font-medium">Home address</div>
                                <div>
                                    {workspace.home_postcode ?? "—"} {workspace.home_house_number ?? ""}
                                </div>
                            </div>

                            <div>
                                <div className="font-medium">Advies</div>
                                <div>
                                    {(workspace.advies_levels ?? []).join(" / ") || "—"}{" "}
                                    {workspace.advies_levels?.length === 2 && (
                                        <span className="text-xs text-muted-foreground">
                                            (match: {workspace.advies_match_mode})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <hr />

                        <div className="space-y-4">
                            <h2 className="text-base font-semibold">Edit settings</h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="space-y-1">
                                    <div className="text-sm font-medium">Postcode</div>
                                    <input
                                        className="w-full rounded-md border px-3 py-2"
                                        value={homePostcode}
                                        onChange={(e) => setHomePostcode(e.target.value)}
                                        placeholder="1234 AB"
                                    />
                                </label>

                                <label className="space-y-1">
                                    <div className="text-sm font-medium">House number</div>
                                    <input
                                        className="w-full rounded-md border px-3 py-2"
                                        value={homeHouseNumber}
                                        onChange={(e) => setHomeHouseNumber(e.target.value)}
                                        placeholder="10"
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="space-y-1">
                                    <div className="text-sm font-medium">Advies level 1</div>
                                    <input
                                        className="w-full rounded-md border px-3 py-2"
                                        value={advies1}
                                        onChange={(e) => setAdvies1(e.target.value)}
                                        placeholder="havo"
                                    />
                                </label>

                                <label className="space-y-1">
                                    <div className="text-sm font-medium">Advies level 2 (optional)</div>
                                    <input
                                        className="w-full rounded-md border px-3 py-2"
                                        value={advies2}
                                        onChange={(e) => setAdvies2(e.target.value)}
                                        placeholder="vwo"
                                    />
                                </label>
                            </div>

                            {Boolean(advies1.trim()) && Boolean(advies2.trim()) && (
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={matchMode === "both"}
                                        onChange={(e) => setMatchMode(e.target.checked ? "both" : "either")}
                                    />
                                    <span>Only show schools that offer BOTH levels</span>
                                </label>
                            )}

                            <div className="flex items-center gap-3">
                                <button
                                    className="rounded-md border px-3 py-2"
                                    onClick={saveSettings}
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : "Save"}
                                </button>
                                {savedMsg && <span className="text-green-700">{savedMsg}</span>}
                                {commuteMsg && <span className="text-muted-foreground">{commuteMsg}</span>}
                            </div>

                            <p className="text-muted-foreground">
                                Next: we’ll use these settings to filter schools and calculate cycling
                                time/distance.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
