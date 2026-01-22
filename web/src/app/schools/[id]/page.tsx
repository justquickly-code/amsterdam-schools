"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, getLocale, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { shortlistRankCapForLevels } from "@/lib/levels";
import { Wordmark } from "@/components/schoolkeuze";
import { InfoCard } from "@/components/schoolkeuze";

type Workspace = { id: string; advies_levels?: string[] };

type WorkspaceRow = { id: string; language?: Language | null; advies_levels?: string[] };

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
    rating_stars: number | null;
    updated_at?: string | null;
};

type VisitRow = {
    id: string;
    workspace_id: string;
    school_id: string;
    attended: boolean;
    rating_stars: number | null;
    updated_at?: string | null;
};

type VisitNoteRow = {
    id: string;
    workspace_id: string;
    school_id: string;
    user_id: string;
    notes: string | null;
    updated_at: string | null;
};

type MemberRow = {
    user_id: string;
    member_email: string | null;
};

type ShortlistRow = { id: string };

type ShortlistItemRow = { rank: number | null; school_id: string };

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

function fmtDate(iso: string, locale: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function fmtTime(iso: string, locale: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function stripAnyUrlLabel(s: string | null) {
    if (!s) return null;
    return s.replace(/\s*\(https?:\/\/[^)]+\)\s*/gi, " ").replace(/\s+/g, " ").trim();
}

function pillClass() {
    return "text-xs rounded-full border px-2 py-0.5 text-muted-foreground";
}

function actionClass() {
    return "text-xs font-semibold rounded-full border bg-secondary/60 px-3 py-1 text-foreground hover:bg-secondary shadow-sm";
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
                        className={`text-xl ${n <= current ? "text-primary" : "text-muted-foreground/50"}`}
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
    const searchParams = useSearchParams();
    const schoolId = params?.id;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [school, setSchool] = useState<School | null>(null);
    const [visit, setVisit] = useState<Visit | null>(null);
    const [visitUpdatedAt, setVisitUpdatedAt] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [noteText, setNoteText] = useState("");
    const [noteUpdatedAt, setNoteUpdatedAt] = useState<string | null>(null);
    const [otherNotes, setOtherNotes] = useState<
        Array<{ user_id: string; email: string; notes: string }>
    >([]);
    const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
    const [openDays, setOpenDays] = useState<OpenDay[]>([]);
    const [plannedOpenDayIds, setPlannedOpenDayIds] = useState<Set<string>>(new Set());
    const [planningId, setPlanningId] = useState<string | null>(null);

    const [attended, setAttended] = useState(false);
    const [rating, setRating] = useState<number | null>(null);
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
            setCurrentUserId(session.session.user.id);

            const { workspace: ws, error: wErr } = await fetchCurrentWorkspace<WorkspaceRow>(
                "id,language"
            );

            if (!mounted) return;
            const workspaceRow = (ws ?? null) as WorkspaceRow | null;
            if (wErr || !workspaceRow) {
                setError(wErr ?? "No workspace found.");
                setLoading(false);
                return;
            }
            setWorkspace(workspaceRow);
            setLanguage((workspaceRow?.language as Language) ?? readStoredLanguage());

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
                .select("id,workspace_id,school_id,attended,rating_stars,updated_at")
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
            setVisitUpdatedAt(visitRow?.updated_at ?? null);

            const existing = visitRow;
            setAttended(existing?.attended ?? false);
            setRating(existing?.rating_stars ?? null);

            const { data: memberRows } = await supabase
                .from("workspace_members")
                .select("user_id,member_email")
                .eq("workspace_id", workspaceRow.id);

            const memberList = (memberRows ?? []) as MemberRow[];
            const memberMap = new Map<string, string>();
            for (const m of memberList) {
                if (m.user_id) memberMap.set(m.user_id, m.member_email ?? "Member");
            }

            const { data: noteRows, error: nErr } = await supabase
                .from("visit_notes")
                .select("id,workspace_id,school_id,user_id,notes,updated_at")
                .eq("workspace_id", workspaceRow.id)
                .eq("school_id", schoolId);

            if (!mounted) return;
            if (nErr) {
                setError(nErr.message);
                setLoading(false);
                return;
            }

            const notesList = (noteRows ?? []) as VisitNoteRow[];
            const own = notesList.find((n) => n.user_id === session.session?.user.id) ?? null;
            setNoteText(own?.notes ?? "");
            setNoteUpdatedAt(own?.updated_at ?? null);
            setOtherNotes(
                notesList
                    .filter((n) => n.user_id !== session.session?.user.id)
                    .map((n) => ({
                        user_id: n.user_id,
                        email: memberMap.get(n.user_id) ?? "Member",
                        notes: n.notes ?? "",
                    }))
                    .filter((n) => n.notes.trim().length > 0)
            );

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
        };
        if (visit) {
            const { data, error } = await supabase
                .from("visits")
                .update(payload)
                .eq("workspace_id", workspace.id)
                .eq("school_id", school.id)
                .eq("updated_at", visitUpdatedAt)
                .select("id,workspace_id,school_id,attended,notes,pros,cons,rating_stars,updated_at");

            if (error) {
                setError(error.message);
            } else if (!data || data.length === 0) {
                setError("This note was updated by someone else. Please reload and try again.");
            } else {
                const row = (data ?? [])[0] as VisitRow;
                setVisit(row);
                setVisitUpdatedAt(row.updated_at ?? null);
                setSavedMsg("Saved.");
            }
        } else {
            const { data, error } = await supabase
                .from("visits")
                .insert(payload)
                .select("id,workspace_id,school_id,attended,rating_stars,updated_at")
                .maybeSingle();

            if (error) {
                if (error.code === "23505") {
                    setError("This note was just created by someone else. Please reload.");
                } else {
                    setError(error.message);
                }
            } else {
                setVisit((data ?? null) as VisitRow | null);
                setVisitUpdatedAt((data as VisitRow | null)?.updated_at ?? null);
                setSavedMsg("Saved.");
            }
        }

        const trimmedNote = noteText.trim();
        if (trimmedNote) {
            const { data: noteRow, error: noteErr } = await supabase
                .from("visit_notes")
                .upsert(
                    {
                        workspace_id: workspace.id,
                        school_id: school.id,
                        user_id: currentUserId,
                        notes: trimmedNote,
                    },
                    { onConflict: "workspace_id,school_id,user_id" }
                )
                .select("id,notes,updated_at")
                .maybeSingle();

            if (noteErr) {
                setError(noteErr.message);
            } else {
                setNoteUpdatedAt(noteRow?.updated_at ?? null);
            }
        } else if (noteUpdatedAt) {
            await supabase
                .from("visit_notes")
                .delete()
                .eq("workspace_id", workspace.id)
                .eq("school_id", school.id)
                .eq("user_id", currentUserId);
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

        // Find first empty rank up to advice cap
        const { data: items, error: iErr } = await supabase
            .from("shortlist_items")
            .select("rank,school_id")
            .eq("shortlist_id", shortlistId);

        if (iErr) {
            setError(iErr.message);
            return;
        }

        const itemRows = (items ?? []) as ShortlistItemRow[];
        const taken = new Set<number>(
            itemRows
                .map((x) => x.rank)
                .filter((r): r is number => typeof r === "number")
        );
        const already = itemRows.some((x) => x.school_id === school.id);
        if (already) {
            setShortlistMsg(t(language, "schools.shortlist_already"));
            return;
        }

        let rank: number | null = null;
        const cap = shortlistRankCapForLevels(workspace?.advies_levels ?? []);
        for (let r = 1; r <= cap; r++) {
            if (!taken.has(r)) {
                rank = r;
                break;
            }
        }

        const { error: upErr } = await supabase.from("shortlist_items").insert({
            shortlist_id: shortlistId,
            school_id: school.id,
            rank,
        });

        if (upErr) {
            setError(upErr.message);
        } else if (rank) {
            setShortlistMsg(
                t(language, "schools.shortlist_added_ranked").replace("#{rank}", String(rank))
            );
        } else {
            setShortlistMsg(t(language, "schools.shortlist_added_unranked"));
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

    useEffect(() => {
        function onLang(e: Event) {
            const next = (e as CustomEvent<Language>).detail;
            if (next) setLanguage(next);
        }
        window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
        return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
    }, []);

    const locale = getLocale(language);

    if (loading) {
        return (
            <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
                <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center">
                    <p className="text-sm text-muted-foreground">Loading…</p>
                </div>
            </main>
        );
    }

    const from = searchParams.get("from");
    const backHref = from === "shortlist" ? "/shortlist" : from === "dashboard" ? "/" : "/schools";

    return (
        <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-4xl space-y-6">
                <header className="flex flex-col gap-2">
                    <Wordmark />
                    <Link
                        className="text-sm font-semibold text-primary hover:underline"
                        href={backHref}
                        aria-label="Back"
                    >
                        ← Back
                    </Link>
                    <h1 className="text-3xl font-semibold text-foreground">{school?.name ?? "School"}</h1>
                </header>

                {error && (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        Error: {error}
                    </div>
                )}

                {school && (
                    <InfoCard title="Overview">
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <div>{(school.supported_levels ?? []).join(", ")}</div>
                            {school.address && <div>{school.address}</div>}
                            {school.website_url && (
                                <a className="text-sm text-primary underline" href={school.website_url} target="_blank" rel="noreferrer">
                                    Website
                                </a>
                            )}
                        </div>
                    </InfoCard>
                )}

                <InfoCard
                    title="Open days"
                    action={<span className="text-xs text-muted-foreground">Verify details on the school website.</span>}
                >
                    {openDays.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No open days available yet.</div>
                    ) : (
                        <ul className="divide-y rounded-2xl border bg-card">
                            {openDays.map((r) => {
                                const label = eventTypeLabel(r.event_type);
                                const location = stripAnyUrlLabel(r.location_text);
                                const planned = plannedOpenDayIds.has(r.id);
                                const dateLabel = r.starts_at ? fmtDate(r.starts_at, locale) : "Unknown date";
                                return (
                                    <li key={r.id} className="p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="font-medium text-foreground">{dateLabel}</div>
                                                    {label && <span className={pillClass()}>{label}</span>}
                                                    {planned && <span className={pillClass()}>{t(language, "open_days.planned")}</span>}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {r.starts_at ? fmtTime(r.starts_at, locale) : "—"}
                                                    {r.ends_at ? `–${fmtTime(r.ends_at, locale)}` : ""}
                                                    {location ? ` • ${location}` : ""}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 sm:shrink-0 sm:justify-end">
                                                <button
                                                    className={actionClass()}
                                                    type="button"
                                                    onClick={() => togglePlanned(r.id)}
                                                    disabled={planningId === r.id}
                                                    title={
                                                        planned
                                                            ? t(language, "open_days.planned")
                                                            : t(language, "open_days.plan")
                                                    }
                                                >
                                                    {planningId === r.id
                                                        ? t(language, "open_days.saving")
                                                        : planned
                                                        ? t(language, "open_days.planned")
                                                        : t(language, "open_days.plan")}
                                                </button>
                                                {r.info_url && (
                                                    <a
                                                        className={actionClass()}
                                                        href={r.info_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title={t(language, "open_days.source")}
                                                    >
                                                        {t(language, "open_days.source")}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </InfoCard>

                <InfoCard title="Your visit notes">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <input
                                    type="checkbox"
                                    checked={attended}
                                    onChange={(e) => setAttended(e.target.checked)}
                                />
                                <span>Visited</span>
                            </label>
                            <StarRating value={rating} onChange={setRating} />
                        </div>

                        <label className="space-y-2 block">
                            <div className="text-sm font-medium text-foreground">Your notes</div>
                            <textarea
                                className="w-full rounded-2xl border bg-background px-4 py-3 min-h-28 text-sm"
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="What stood out? Atmosphere, teachers, vibe…"
                            />
                        </label>

                        {otherNotes.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-foreground">Notes from others</div>
                                <ul className="divide-y rounded-2xl border bg-card">
                                    {otherNotes.map((n) => (
                                        <li key={n.user_id} className="p-4">
                                            <div className="text-xs text-muted-foreground">{n.email}</div>
                                            <div className="text-sm whitespace-pre-wrap text-foreground">{n.notes}</div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
                                onClick={save}
                                disabled={!canSave || saving}
                            >
                                {saving ? "Saving..." : "Save"}
                            </button>
                            {savedMsg && <span className="text-sm text-foreground">{savedMsg}</span>}
                            {visit && (
                                <span className="text-xs text-muted-foreground">Visit record exists</span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                className="rounded-full border px-4 py-2 text-xs font-semibold"
                                onClick={addToShortlist}
                            >
                                {t(language, "schools.shortlist_add_full")}
                            </button>
                            {shortlistMsg && <span className="text-sm text-foreground">{shortlistMsg}</span>}
                        </div>
                    </div>
                </InfoCard>
            </div>
        </main>
    );
}
