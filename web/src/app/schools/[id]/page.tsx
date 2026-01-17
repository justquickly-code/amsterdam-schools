"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Workspace = { id: string };

type School = {
    id: string;
    name: string;
    supported_levels: string[];
    address: string | null;
    website_url: string | null;
};

type Visit = {
    id: string;
    workspace_id: string;
    school_id: string;
    attended: boolean;
    notes: string | null;
    pros: string | null;
    cons: string | null;
    rating_stars: number | null;
};

function StarRating({
    value,
    onChange,
}: {
    value: number | null;
    onChange: (v: number | null) => void;
}) {
    const current = value ?? 0;

    return (
        <div className="flex items-center gap-2">
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        className={`text-xl ${n <= current ? "" : "opacity-30"}`}
                        onClick={() => onChange(n)}
                        aria-label={`${n} stars`}
                    >
                        ★
                    </button>
                ))}
            </div>
            {value != null && (
                <button
                    type="button"
                    className="text-xs underline text-muted-foreground"
                    onClick={() => onChange(null)}
                >
                    clear
                </button>
            )}
        </div>
    );
}

export default function SchoolDetailPage() {
    const params = useParams<{ id: string }>();
    const schoolId = params?.id;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [school, setSchool] = useState<School | null>(null);
    const [visit, setVisit] = useState<Visit | null>(null);

    const [attended, setAttended] = useState(false);
    const [rating, setRating] = useState<number | null>(null);
    const [notes, setNotes] = useState("");
    const [pros, setPros] = useState("");
    const [cons, setCons] = useState("");
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");
    const [shortlistMsg, setShortlistMsg] = useState("");

    useEffect(() => {
        let mounted = true;

        async function load() {
            setLoading(true);
            setError("");
            setSavedMsg("");

            const { data: session } = await supabase.auth.getSession();
            if (!session.session) {
                setError("Not signed in.");
                setLoading(false);
                return;
            }

            const { data: ws, error: wErr } = await supabase
                .from("workspaces")
                .select("id")
                .limit(1)
                .maybeSingle();

            if (!mounted) return;
            if (wErr || !ws) {
                setError(wErr?.message ?? "No workspace found.");
                setLoading(false);
                return;
            }
            setWorkspace(ws as any);

            const { data: sch, error: sErr } = await supabase
                .from("schools")
                .select("id,name,supported_levels,address,website_url")
                .eq("id", schoolId)
                .maybeSingle();

            if (!mounted) return;
            if (sErr || !sch) {
                setError(sErr?.message ?? "School not found.");
                setLoading(false);
                return;
            }
            setSchool(sch as any);

            const { data: v, error: vErr } = await supabase
                .from("visits")
                .select("id,workspace_id,school_id,attended,notes,pros,cons,rating_stars")
                .eq("workspace_id", (ws as any).id)
                .eq("school_id", schoolId)
                .maybeSingle();

            if (!mounted) return;
            if (vErr) {
                setError(vErr.message);
                setLoading(false);
                return;
            }

            setVisit((v as any) ?? null);

            const existing = (v as any) as Visit | null;
            setAttended(existing?.attended ?? false);
            setRating(existing?.rating_stars ?? null);
            setNotes(existing?.notes ?? "");
            setPros(existing?.pros ?? "");
            setCons(existing?.cons ?? "");

            setLoading(false);
        }

        load();

        return () => {
            mounted = false;
        };
    }, [schoolId]);

    const canSave = useMemo(() => Boolean(workspace && school), [workspace, school]);

    async function save() {
        if (!workspace || !school) return;

        setSaving(true);
        setSavedMsg("");
        setError("");

        const payload = {
            workspace_id: workspace.id,
            school_id: school.id,
            attended,
            rating_stars: rating,
            notes: notes.trim() || null,
            pros: pros.trim() || null,
            cons: cons.trim() || null,
        };

        const { data, error } = await supabase
            .from("visits")
            .upsert(payload, { onConflict: "workspace_id,school_id" })
            .select("id,workspace_id,school_id,attended,notes,pros,cons,rating_stars")
            .maybeSingle();

        if (error) {
            setError(error.message);
        } else {
            setVisit(data as any);
            setSavedMsg("Saved.");
        }

        setSaving(false);
    }

    async function addToShortlist() {
        if (!workspace || !school) return;

        setError("");
        setShortlistMsg("");

        // Ensure shortlist exists
        const { data: existing, error: sErr } = await supabase
            .from("shortlists")
            .select("id")
            .eq("workspace_id", workspace.id)
            .maybeSingle();

        if (sErr && sErr.code !== "PGRST116") {
            setError(sErr.message);
            return;
        }

        let shortlistId = (existing as any)?.id as string | undefined;

        if (!shortlistId) {
            const { data: created, error: cErr } = await supabase
                .from("shortlists")
                .insert({ workspace_id: workspace.id })
                .select("id")
                .maybeSingle();

            if (cErr || !created) {
                setError(cErr?.message ?? "Could not create shortlist.");
                return;
            }
            shortlistId = (created as any).id;
        }

        // Find first empty rank 1..12
        const { data: items, error: iErr } = await supabase
            .from("shortlist_items")
            .select("rank,school_id")
            .eq("shortlist_id", shortlistId);

        if (iErr) {
            setError(iErr.message);
            return;
        }

        const taken = new Set<number>(((items as any) ?? []).map((x: any) => x.rank));
        const already = ((items as any) ?? []).some((x: any) => x.school_id === school.id);
        if (already) {
            setShortlistMsg("Already in shortlist.");
            return;
        }

        let rank: number | null = null;
        for (let r = 1; r <= 12; r++) {
            if (!taken.has(r)) {
                rank = r;
                break;
            }
        }

        if (!rank) {
            setError("Shortlist is full (max 12). Remove something first.");
            return;
        }

        const { error: upErr } = await supabase.from("shortlist_items").insert({
            shortlist_id: shortlistId,
            school_id: school.id,
            rank,
        });

        if (upErr) {
            setError(upErr.message);
        } else {
            setShortlistMsg(`Added to shortlist at #${rank}.`);
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center p-6">
                <p className="text-sm">Loading…</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen p-6 flex items-start justify-center">
            <div className="w-full max-w-2xl rounded-xl border p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">{school?.name ?? "School"}</h1>
                    <div className="flex gap-3">
                        <Link className="text-sm underline" href="/schools">
                            Back to Schools
                        </Link>
                        <Link className="text-sm underline" href="/settings">
                            Settings
                        </Link>
                    </div>
                </div>

                {error && <p className="text-sm text-red-600">Error: {error}</p>}

                {school && (
                    <div className="text-sm text-muted-foreground space-y-1">
                        <div>{(school.supported_levels ?? []).join(", ")}</div>
                        {school.address && <div>{school.address}</div>}
                        {school.website_url && (
                            <a className="underline" href={school.website_url} target="_blank" rel="noreferrer">
                                Website
                            </a>
                        )}
                    </div>
                )}

                <hr />

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={attended}
                                onChange={(e) => setAttended(e.target.checked)}
                            />
                            <span>Attended open day</span>
                        </label>

                        <StarRating value={rating} onChange={setRating} />
                    </div>

                    <label className="space-y-1 block">
                        <div className="text-sm font-medium">Notes</div>
                        <textarea
                            className="w-full rounded-md border px-3 py-2 min-h-28"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="What stood out? Atmosphere, teachers, vibe…"
                        />
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="space-y-1 block">
                            <div className="text-sm font-medium">Pros</div>
                            <textarea
                                className="w-full rounded-md border px-3 py-2 min-h-24"
                                value={pros}
                                onChange={(e) => setPros(e.target.value)}
                                placeholder="Good points…"
                            />
                        </label>

                        <label className="space-y-1 block">
                            <div className="text-sm font-medium">Cons</div>
                            <textarea
                                className="w-full rounded-md border px-3 py-2 min-h-24"
                                value={cons}
                                onChange={(e) => setCons(e.target.value)}
                                placeholder="Concerns…"
                            />
                        </label>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            className="rounded-md border px-3 py-2"
                            onClick={save}
                            disabled={!canSave || saving}
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                        {savedMsg && <span className="text-green-700">{savedMsg}</span>}
                        {visit && (
                            <span className="text-xs text-muted-foreground">
                                Visit record exists
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="rounded-md border px-3 py-2" onClick={addToShortlist}>
                            Add to shortlist
                        </button>
                        {shortlistMsg && <span className="text-green-700">{shortlistMsg}</span>}
                    </div>
                </div>
            </div>
        </main>
    );
}