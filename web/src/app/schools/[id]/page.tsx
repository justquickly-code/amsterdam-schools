"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Workspace = { id: string };

type WorkspaceRow = { id: string };

type School = {
    id: string;
    name: string;
    supported_levels: string[];
    address: string | null;
    website_url: string | null;
};

type SchoolRow = {
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

type VisitRow = {
    id: string;
    workspace_id: string;
    school_id: string;
    attended: boolean;
    notes: string | null;
    pros: string | null;
    cons: string | null;
    rating_stars: number | null;
};

type ShortlistRow = { id: string };

type ShortlistItemRow = { rank: number; school_id: string };

type OpenDay = {
    id: string;
    starts_at: string | null;
    ends_at: string | null;
    location_text: string | null;
    info_url: string | null;
    event_type: string | null;
    is_active?: boolean;
};

type OpenDayRow = {
    id: string;
    starts_at: string | null;
    ends_at: string | null;
    location_text: string | null;
    info_url: string | null;
    event_type: string | null;
    is_active?: boolean;
};

type PlannedOpenDayRow = {
    open_day_id: string;
};

const EVENT_TYPE_LABELS: Record<string, string> = {
    open_dag: "Open dag",
    open_avond: "Open avond",
    informatieavond: "Info-avond",
    proefles: "Proefles",
    other: "Other",
};

function normalizeEventType(t: string | null) {
    const raw = (t ?? "").toLowerCase().trim();
    if (!raw) return "other";
    if (raw.includes("open_dag") || raw.includes("open dag")) return "open_dag";
    if (raw.includes("open_avond") || raw.includes("open avond")) return "open_avond";
    if (raw.includes("informatieavond") || raw.includes("infoavond") || raw.includes("info-avond"))
        return "informatieavond";
    if (raw.includes("proefles") || raw.includes("meeloop") || raw.includes("lesjes")) return "proefles";
    return "other";
}

function eventTypeLabel(t: string | null) {
    return EVENT_TYPE_LABELS[normalizeEventType(t)] ?? null;
}

function fmtDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("nl-NL", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function fmtTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function stripAnyUrlLabel(s: string | null) {
    if (!s) return null;
    return s.replace(/\s*\(https?:\/\/[^)]+\)\s*/gi, " ").replace(/\s+/g, " ").trim();
}

function pillClass() {
    return "text-xs rounded-full border px-2 py-0.5 text-muted-foreground";
}

function actionClass() {
    return "text-xs rounded-md border px-2 py-1 hover:bg-muted/30";
}

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
    const [openDays, setOpenDays] = useState<OpenDay[]>([]);
    const [plannedOpenDayIds, setPlannedOpenDayIds] = useState<Set<string>>(new Set());
    const [planningId, setPlanningId] = useState<string | null>(null);

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
            const workspaceRow = (ws ?? null) as WorkspaceRow | null;
            if (wErr || !workspaceRow) {
                setError(wErr?.message ?? "No workspace found.");
                setLoading(false);
                return;
            }
            setWorkspace(workspaceRow);

            const { data: sch, error: sErr } = await supabase
                .from("schools")
                .select("id,name,supported_levels,address,website_url")
                .eq("id", schoolId)
                .maybeSingle();

            if (!mounted) return;
            const schoolRow = (sch ?? null) as SchoolRow | null;
            if (sErr || !schoolRow) {
                setError(sErr?.message ?? "School not found.");
                setLoading(false);
                return;
            }
            setSchool(schoolRow);

            const { data: v, error: vErr } = await supabase
                .from("visits")
                .select("id,workspace_id,school_id,attended,notes,pros,cons,rating_stars")
                .eq("workspace_id", workspaceRow.id)
                .eq("school_id", schoolId)
                .maybeSingle();

            if (!mounted) return;
            if (vErr) {
                setError(vErr.message);
                setLoading(false);
                return;
            }

            const visitRow = (v ?? null) as VisitRow | null;
            setVisit(visitRow);

            const existing = visitRow;
            setAttended(existing?.attended ?? false);
            setRating(existing?.rating_stars ?? null);
            setNotes(existing?.notes ?? "");
            setPros(existing?.pros ?? "");
            setCons(existing?.cons ?? "");

            const { data: openDaysRows, error: oErr } = await supabase
                .from("open_days")
                .select("id,starts_at,ends_at,location_text,info_url,event_type,is_active")
                .eq("school_id", schoolId)
                .eq("is_active", true)
                .order("starts_at", { ascending: true });

            if (!mounted) return;
            if (oErr) {
                setError(oErr.message);
                setLoading(false);
                return;
            }

            const odList = (openDaysRows ?? []) as OpenDayRow[];
            const mapped = odList.map((row) => ({
                id: row.id,
                starts_at: row.starts_at ?? null,
                ends_at: row.ends_at ?? null,
                location_text: row.location_text ?? null,
                info_url: row.info_url ?? null,
                event_type: row.event_type ?? null,
                is_active: row.is_active,
            })) as OpenDay[];
            setOpenDays(mapped);

            if (workspaceRow.id && mapped.length > 0) {
                const { data: plannedRows, error: pErr } = await supabase
                    .from("planned_open_days")
                    .select("open_day_id")
                    .eq("workspace_id", workspaceRow.id)
                    .in(
                        "open_day_id",
                        mapped.map((r) => r.id)
                    );

                if (!mounted) return;
                if (pErr) {
                    setError(pErr.message);
                    setLoading(false);
                    return;
                }

                const plannedList = (plannedRows ?? []) as PlannedOpenDayRow[];
                setPlannedOpenDayIds(new Set(plannedList.map((p) => p.open_day_id)));
            } else {
                setPlannedOpenDayIds(new Set());
            }

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
            setVisit((data ?? null) as VisitRow | null);
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

        const existingRow = (existing ?? null) as ShortlistRow | null;
        let shortlistId = existingRow?.id as string | undefined;

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
            shortlistId = (created as ShortlistRow).id;
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

        const itemRows = (items ?? []) as ShortlistItemRow[];
        const taken = new Set<number>(itemRows.map((x) => x.rank));
        const already = itemRows.some((x) => x.school_id === school.id);
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

    async function togglePlanned(openDayId: string) {
        if (!workspace) return;
        setPlanningId(openDayId);
        setError("");

        const planned = plannedOpenDayIds.has(openDayId);
        if (planned) {
            const { error: delErr } = await supabase
                .from("planned_open_days")
                .delete()
                .eq("workspace_id", workspace.id)
                .eq("open_day_id", openDayId);

            if (delErr) {
                setError(delErr.message);
                setPlanningId(null);
                return;
            }

            setPlannedOpenDayIds((prev) => {
                const next = new Set(prev);
                next.delete(openDayId);
                return next;
            });
            setPlanningId(null);
            return;
        }

        const { error: insErr } = await supabase.from("planned_open_days").insert({
            workspace_id: workspace.id,
            open_day_id: openDayId,
            planned_at: new Date().toISOString(),
        });

        if (insErr) {
            setError(insErr.message);
        } else {
            setPlannedOpenDayIds((prev) => new Set(prev).add(openDayId));
        }
        setPlanningId(null);
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
                <div className="flex items-center gap-3">
                    <Link className="text-sm underline" href="/schools" aria-label="Back to Schools">
                        ← Back
                    </Link>
                    <h1 className="text-2xl font-semibold">{school?.name ?? "School"}</h1>
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

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Open days</h2>
                        <div className="text-xs text-muted-foreground">
                            Verify details on the school website.
                        </div>
                    </div>

                    {openDays.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No open days available yet.</div>
                    ) : (
                        <ul className="divide-y rounded-lg border">
                            {openDays.map((r) => {
                                const label = eventTypeLabel(r.event_type);
                                const location = stripAnyUrlLabel(r.location_text);
                                const planned = plannedOpenDayIds.has(r.id);
                                const dateLabel = r.starts_at ? fmtDate(r.starts_at) : "Unknown date";
                                return (
                                    <li key={r.id} className="p-3">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <div className="font-medium">{dateLabel}</div>
                                                    {label && <span className={pillClass()}>{label}</span>}
                                                    {planned && <span className={pillClass()}>Planned</span>}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {r.starts_at ? fmtTime(r.starts_at) : "—"}
                                                    {r.ends_at ? `–${fmtTime(r.ends_at)}` : ""}
                                                    {location ? ` • ${location}` : ""}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 sm:shrink-0 sm:justify-end">
                                                <button
                                                    className={actionClass()}
                                                    type="button"
                                                    onClick={() => togglePlanned(r.id)}
                                                    disabled={planningId === r.id}
                                                    title="Mark as planned"
                                                >
                                                    {planningId === r.id
                                                        ? "Saving..."
                                                        : planned
                                                        ? "Planned"
                                                        : "Plan"}
                                                </button>
                                                {r.info_url && (
                                                    <a
                                                        className={actionClass()}
                                                        href={r.info_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Source
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

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
