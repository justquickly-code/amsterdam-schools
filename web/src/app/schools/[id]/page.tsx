"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, getLocale, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { shortlistRankCapForLevels } from "@/lib/levels";
import { CATEGORY_KEYS, CategoryKey, RATING_EMOJIS, computeFitPercent } from "@/lib/categoryRatings";
import { badgeNeutral, badgeStrong, fitBadgeClass } from "@/lib/badges";
import { InfoCard, MapboxMap, SchoolRow } from "@/components/schoolkeuze";
import { buttonOutline, buttonPrimary, pillAction } from "@/lib/ui";
import { ArrowLeft, Heart, Star } from "lucide-react";
import { googleMapsDirectionsUrl, googleMapsPlaceUrl } from "@/lib/maps";

type Workspace = {
    id: string;
    advies_levels?: string[];
    home_postcode?: string | null;
    home_house_number?: string | null;
    home_lat?: number | null;
    home_lng?: number | null;
};

type WorkspaceRow = {
    id: string;
    language?: Language | null;
    advies_levels?: string[];
    home_postcode?: string | null;
    home_house_number?: string | null;
    home_lat?: number | null;
    home_lng?: number | null;
};

type School = {
    id: string;
    name: string;
    supported_levels: string[];
    address: string | null;
    website_url: string | null;
    image_url?: string | null;
    lat?: number | null;
    lng?: number | null;
};

type SchoolRowData = {
    id: string;
    name: string;
    supported_levels: string[];
    address: string | null;
    website_url: string | null;
    image_url?: string | null;
    lat?: number | null;
    lng?: number | null;
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

type CategoryRatingRow = {
    category: string;
    rating: number | null;
};

type SchoolMetricRow = {
    metric_group: string;
    metric_name: string;
    period: string | null;
    value_numeric: number | null;
    value_text: string | null;
    unit: string | null;
    notes: string | null;
    source: string | null;
    public_use_ok: string | null;
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

const DUO_PUPIL_METRICS = [
    "pupils_total_known",
    "pupils_known_brug",
    "pupils_known_vmbo",
    "pupils_known_havo",
    "pupils_known_vwo",
];

const DUO_EXAM_METRICS = [
    "exam_candidates_known_vmbo",
    "pass_rate_known_vmbo",
    "avg_ce_weighted_vmbo",
    "avg_final_weighted_vmbo",
    "exam_candidates_known_havo",
    "pass_rate_known_havo",
    "avg_ce_weighted_havo",
    "avg_final_weighted_havo",
    "exam_candidates_known_vwo",
    "pass_rate_known_vwo",
    "avg_ce_weighted_vwo",
    "avg_final_weighted_vwo",
];

const DUO_METRIC_LABEL_KEYS: Record<string, string> = {
    pupils_total_known: "school.facts.pupils_total",
    pupils_known_brug: "school.facts.pupils_brug",
    pupils_known_vmbo: "school.facts.pupils_vmbo",
    pupils_known_havo: "school.facts.pupils_havo",
    pupils_known_vwo: "school.facts.pupils_vwo",
    exam_candidates_known_vmbo: "school.facts.exams_candidates_vmbo",
    pass_rate_known_vmbo: "school.facts.exams_pass_vmbo",
    avg_ce_weighted_vmbo: "school.facts.exams_ce_vmbo",
    avg_final_weighted_vmbo: "school.facts.exams_final_vmbo",
    exam_candidates_known_havo: "school.facts.exams_candidates_havo",
    pass_rate_known_havo: "school.facts.exams_pass_havo",
    avg_ce_weighted_havo: "school.facts.exams_ce_havo",
    avg_final_weighted_havo: "school.facts.exams_final_havo",
    exam_candidates_known_vwo: "school.facts.exams_candidates_vwo",
    pass_rate_known_vwo: "school.facts.exams_pass_vwo",
    avg_ce_weighted_vwo: "school.facts.exams_ce_vwo",
    avg_final_weighted_vwo: "school.facts.exams_final_vwo",
};

function formatMetricValue(
    metricName: string,
    valueNumeric: number | null,
    valueText: string | null,
    unit: string | null,
    locale: string
) {
    if (valueNumeric === null || Number.isNaN(valueNumeric)) {
        return valueText ?? null;
    }
    if (metricName.startsWith("pass_rate")) {
        const pct = valueNumeric * 100;
        return `${pct.toFixed(pct % 1 === 0 ? 0 : 1)}%`;
    }
    if (unit === "students") {
        return new Intl.NumberFormat(locale).format(Math.round(valueNumeric));
    }
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(valueNumeric);
}

function stripAnyUrlLabel(s: string | null) {
    if (!s) return null;
    return s.replace(/\s*\(https?:\/\/[^)]+\)\s*/gi, " ").replace(/\s+/g, " ").trim();
}

function pillClass() {
    return badgeNeutral;
}

function actionClass() {
    return pillAction;
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
                        className="text-xl"
                        onClick={() => onChange(n)}
                        aria-label={`${n} stars`}
                    >
                        <Star
                            className={`h-5 w-5 ${
                                n <= current ? "fill-primary text-primary" : "text-muted-foreground/50"
                            }`}
                        />
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

function categoryLabelKey(category: CategoryKey) {
    return `ratings.category.${category}`;
}

function ratingButtonClass(selected: boolean) {
    return `flex h-9 w-9 items-center justify-center rounded-full border text-lg transition ${
        selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
    }`;
}

export default function SchoolDetailPage() {
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const schoolId = params?.id;
    const router = useRouter();

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
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [route, setRoute] = useState<{ coordinates: Array<[number, number]> } | null>(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [hasSession, setHasSession] = useState(false);
    const [duoMetrics, setDuoMetrics] = useState<SchoolMetricRow[]>([]);

    const [attended, setAttended] = useState(false);
    const [rating, setRating] = useState<number | null>(null);
    const [categoryRatings, setCategoryRatings] = useState<Record<CategoryKey, number | null>>(() => {
        const initial: Record<CategoryKey, number | null> = {
            atmosphere: null,
            sciences: null,
            arts: null,
            languages: null,
            facilities: null,
            teachers_students: null,
            unique_offerings: null,
        };
        return initial;
    });
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");
    const [shortlistMsg, setShortlistMsg] = useState("");
    const [isShortlisted, setIsShortlisted] = useState(false);
    const fitScore = useMemo(
        () => computeFitPercent(Object.values(categoryRatings)),
        [categoryRatings]
    );

    const duoMetricsPeriod = useMemo(() => {
        const periods = Array.from(new Set(duoMetrics.map((m) => m.period).filter(Boolean))) as string[];
        if (!periods.length) return null;
        return periods.sort().slice(-1)[0];
    }, [duoMetrics]);

    const duoMetricsByName = useMemo(() => {
        const map = new Map<string, SchoolMetricRow>();
        for (const metric of duoMetrics) {
            const existing = map.get(metric.metric_name);
            if (!existing) {
                map.set(metric.metric_name, metric);
                continue;
            }
            if (duoMetricsPeriod && metric.period === duoMetricsPeriod) {
                map.set(metric.metric_name, metric);
            }
        }
        return map;
    }, [duoMetrics, duoMetricsPeriod]);

    const buildMetricItems = (names: string[]) =>
        names
            .map((name) => {
                const metric = duoMetricsByName.get(name);
                if (!metric) return null;
                const value = formatMetricValue(
                    metric.metric_name,
                    metric.value_numeric,
                    metric.value_text,
                    metric.unit,
                    locale
                );
                if (!value) return null;
                return {
                    name,
                    label: DUO_METRIC_LABEL_KEYS[name] ? t(language, DUO_METRIC_LABEL_KEYS[name]) : name,
                    value,
                };
            })
            .filter(Boolean) as Array<{ name: string; label: string; value: string }>;

    useEffect(() => {
        let mounted = true;

        async function load() {
            setLoading(true);
            setError("");
            setSavedMsg("");
            setDuoMetrics([]);

            const { data: session } = await supabase.auth.getSession();
            const authed = Boolean(session.session);
            setHasSession(authed);
            setCurrentUserId(session.session?.user.id ?? "");

            let workspaceRow: WorkspaceRow | null = null;
            if (authed) {
                const { workspace: ws, error: wErr } = await fetchCurrentWorkspace<WorkspaceRow>(
                    "id,language,home_postcode,home_house_number,home_lat,home_lng"
                );

                if (!mounted) return;
                workspaceRow = (ws ?? null) as WorkspaceRow | null;
                if (wErr || !workspaceRow) {
                    setError(wErr ?? "No workspace found.");
                    setLoading(false);
                    return;
                }
                setWorkspace(workspaceRow);
                setLanguage((workspaceRow?.language as Language) ?? readStoredLanguage());
                if (schoolId) {
                    const { data: shortlistRow, error: sErr } = await supabase
                        .from("shortlists")
                        .select("id")
                        .eq("workspace_id", workspaceRow.id)
                        .maybeSingle();

                    if (!mounted) return;
                    if (sErr && sErr.code !== "PGRST116") {
                        setError(sErr.message);
                        setLoading(false);
                        return;
                    }

                    if (shortlistRow?.id) {
                        const { data: itemRow, error: iErr } = await supabase
                            .from("shortlist_items")
                            .select("school_id")
                            .eq("shortlist_id", shortlistRow.id)
                            .eq("school_id", schoolId)
                            .maybeSingle();

                        if (!mounted) return;
                        if (iErr && iErr.code !== "PGRST116") {
                            setError(iErr.message);
                            setLoading(false);
                            return;
                        }

                        setIsShortlisted(Boolean(itemRow?.school_id));
                    } else {
                        setIsShortlisted(false);
                    }
                }
            } else {
                setWorkspace(null);
                setLanguage(readStoredLanguage());
            }

            const { data: sch, error: sErr } = await supabase
                .from("schools")
                .select("id,name,supported_levels,address,website_url,image_url,lat,lng")
                .eq("id", schoolId)
                .maybeSingle();

            if (!mounted) return;
            const schoolRow = (sch ?? null) as SchoolRowData | null;
            if (sErr || !schoolRow) {
                setError(sErr?.message ?? "School not found.");
                setLoading(false);
                return;
            }
            setSchool(schoolRow);

            const { data: metricRows, error: mErr } = await supabase
                .from("school_metrics")
                .select("metric_group,metric_name,period,value_numeric,value_text,unit,notes,source,public_use_ok")
                .eq("school_id", schoolId);

            if (!mounted) return;
            if (mErr) {
                setDuoMetrics([]);
            } else {
                setDuoMetrics((metricRows ?? []) as SchoolMetricRow[]);
            }

            if (authed && workspaceRow) {
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

                const { data: ratingRows, error: rErr } = await supabase
                    .from("school_category_ratings")
                    .select("category,rating")
                    .eq("workspace_id", workspaceRow.id)
                    .eq("school_id", schoolId);

                if (!mounted) return;
                if (rErr) {
                    setError(rErr.message);
                    setLoading(false);
                    return;
                }

                const initialRatings: Record<CategoryKey, number | null> = {
                    atmosphere: null,
                    sciences: null,
                    arts: null,
                    languages: null,
                    facilities: null,
                    teachers_students: null,
                    unique_offerings: null,
                };
                (ratingRows ?? []).forEach((row) => {
                    const r = row as CategoryRatingRow;
                    if (CATEGORY_KEYS.includes(r.category as CategoryKey)) {
                        initialRatings[r.category as CategoryKey] = r.rating ?? null;
                    }
                });
                setCategoryRatings(initialRatings);
            } else {
                setVisit(null);
                setVisitUpdatedAt(null);
                setAttended(false);
                setRating(null);
                setCategoryRatings({
                    atmosphere: null,
                    sciences: null,
                    arts: null,
                    languages: null,
                    facilities: null,
                    teachers_students: null,
                    unique_offerings: null,
                });
                setNoteText("");
                setNoteUpdatedAt(null);
                setOtherNotes([]);
            }

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
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const upcoming = mapped.filter((row) => {
                if (!row.starts_at) return false;
                return new Date(row.starts_at) >= today;
            });
            setOpenDays(upcoming);

            if (authed && workspaceRow?.id && upcoming.length > 0) {
                const { data: plannedRows, error: pErr } = await supabase
                    .from("planned_open_days")
                    .select("open_day_id")
                    .eq("workspace_id", workspaceRow.id)
                    .in(
                        "open_day_id",
                        upcoming.map((r) => r.id)
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

        const toUpsert = CATEGORY_KEYS.map((category) => ({
            workspace_id: workspace.id,
            school_id: school.id,
            category,
            rating: categoryRatings[category],
        })).filter((row) => row.rating != null);

        const toDelete = CATEGORY_KEYS.filter((category) => categoryRatings[category] == null);

        if (toUpsert.length) {
            const { error: upsertErr } = await supabase
                .from("school_category_ratings")
                .upsert(toUpsert, { onConflict: "workspace_id,school_id,category" });
            if (upsertErr) {
                setError(upsertErr.message);
            }
        }

        if (toDelete.length) {
            const { error: deleteErr } = await supabase
                .from("school_category_ratings")
                .delete()
                .eq("workspace_id", workspace.id)
                .eq("school_id", school.id)
                .in("category", toDelete);
            if (deleteErr) {
                setError(deleteErr.message);
            }
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
            setIsShortlisted(true);
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
        if (!upErr) {
            setIsShortlisted(true);
        }
    }

    async function removeFromShortlist() {
        if (!workspace || !school) return;

        setError("");
        setShortlistMsg("");

        const { data: existing, error: sErr } = await supabase
            .from("shortlists")
            .select("id")
            .eq("workspace_id", workspace.id)
            .maybeSingle();

        if (sErr && sErr.code !== "PGRST116") {
            setError(sErr.message);
            return;
        }

        const shortlistId = (existing ?? null)?.id as string | undefined;
        if (!shortlistId) {
            setShortlistMsg(t(language, "schools.shortlist_removed"));
            setIsShortlisted(false);
            return;
        }

        const { error: delErr } = await supabase
            .from("shortlist_items")
            .delete()
            .eq("shortlist_id", shortlistId)
            .eq("school_id", school.id);

        if (delErr) {
            setError(delErr.message);
            return;
        }

        setShortlistMsg(t(language, "schools.shortlist_removed"));
        setIsShortlisted(false);
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

    async function downloadIcs(openDayId: string) {
        if (!hasSession) {
            router.push("/login");
            return;
        }
        setDownloadingId(openDayId);
        setError("");
        try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token ?? "";
            if (!token) {
                setError("You must be logged in to download the calendar invite.");
                return;
            }

            const res = await fetch(`/api/open-days/${openDayId}/ics`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const json = await res.json().catch(() => null);
                throw new Error(json?.error ?? "Calendar download failed");
            }

            const blob = await res.blob();
            const contentDisposition = res.headers.get("content-disposition") ?? "";
            const match = contentDisposition.match(/filename="([^"]+)"/i);
            const filename = match?.[1] ?? "open-day.ics";

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Calendar download failed";
            setError(msg);
        } finally {
            setDownloadingId(null);
        }
    }

    useEffect(() => {
        function onLang(e: Event) {
            const next = (e as CustomEvent<Language>).detail;
            if (next) setLanguage(next);
        }
        window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
        return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
    }, []);

    useEffect(() => {
        let mounted = true;
        async function loadRoute() {
            if (typeof workspace?.home_lat !== "number" || typeof workspace?.home_lng !== "number") {
                setRoute(null);
                return;
            }
            if (typeof school?.lat !== "number" || typeof school?.lng !== "number") {
                setRoute(null);
                return;
            }
            setRouteLoading(true);
            try {
                const res = await fetch("/api/maps/route", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        origin: { lat: workspace.home_lat, lng: workspace.home_lng },
                        destination: { lat: school.lat, lng: school.lng },
                    }),
                });
                const json = await res.json();
                if (!mounted) return;
                if (!res.ok) {
                    setRoute(null);
                } else {
                    setRoute({ coordinates: json.coordinates ?? [] });
                }
            } catch {
                if (!mounted) return;
                setRoute(null);
            } finally {
                if (mounted) setRouteLoading(false);
            }
        }
        loadRoute();
        return () => {
            mounted = false;
        };
    }, [workspace?.home_lat, workspace?.home_lng, school?.lat, school?.lng]);

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
    const backHref = from === "shortlist" ? "/shortlist" : "/";
    const homeOrigin =
        typeof workspace?.home_lat === "number" && typeof workspace?.home_lng === "number"
            ? `${workspace.home_lat},${workspace.home_lng}`
            : workspace?.home_postcode && workspace?.home_house_number
            ? `${workspace.home_postcode} ${workspace.home_house_number} Amsterdam, Netherlands`
            : null;
    const destinationAddress =
        typeof school?.lat === "number" && typeof school?.lng === "number"
            ? `${school.lat},${school.lng}`
            : school?.address ?? school?.name ?? "";
    const pupilItems = buildMetricItems(DUO_PUPIL_METRICS);
    const examItems = buildMetricItems(DUO_EXAM_METRICS);

    return (
        <main className="min-h-screen pb-24">
            <header className="relative -mt-4 overflow-hidden min-h-[260px] md:min-h-[320px]">
                <div className="absolute inset-0">
                    <Image src="/branding/hero/hero-bg.jpg" alt="" fill className="object-cover" priority />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
                </div>
                <div className="relative px-4 pt-10 pb-12 sm:px-6">
                    <div className="mx-auto w-full max-w-4xl">
                        <Link
                            className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:underline"
                            href={backHref}
                            aria-label={t(language, "about.back")}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t(language, "about.back")}
                        </Link>
                        <h1 className="mt-2 text-3xl font-serif font-semibold text-white drop-shadow-sm">{school?.name ?? "School"}</h1>
                    </div>
                </div>
            </header>

            <section className="bg-background px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-4xl space-y-6">

                {error && (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        Error: {error}
                    </div>
                )}

                {school && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-serif font-semibold text-foreground">
                                {t(language, "school.detail_overview")}
                            </h2>
                        </div>
                        <SchoolRow
                            name={school.name}
                            href={`/schools/${school.id}`}
                            imageUrl={school.image_url ?? undefined}
                            subtitle={(school.supported_levels ?? []).join(", ")}
                            meta={
                                school.address ? (
                                    <a
                                        className="text-muted-foreground underline"
                                        href={googleMapsPlaceUrl({ query: school.address })}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {school.address}
                                    </a>
                                ) : null
                            }
                            cornerBadge={
                                <div className="flex flex-col items-end gap-2">
                                    {typeof fitScore === "number" ? (
                                        <span className={`${badgeStrong} ${fitBadgeClass(fitScore)}`}>
                                            {Math.round(fitScore)}% {t(language, "shortlist.fit_label")}
                                        </span>
                                    ) : null}
                                    <button
                                        className={`flex h-10 w-10 items-center justify-center rounded-full text-base shadow-sm transition ${
                                            isShortlisted ? "bg-primary text-primary-foreground" : "border bg-white text-foreground"
                                        }`}
                                        type="button"
                                        aria-label={t(language, "schools.shortlist_add")}
                                        onClick={() => {
                                            if (!hasSession) {
                                                router.push("/login");
                                                return;
                                            }
                                            if (isShortlisted) {
                                                removeFromShortlist();
                                            } else {
                                                addToShortlist();
                                            }
                                        }}
                                    >
                                        <Heart className={`h-4 w-4 ${isShortlisted ? "fill-current" : ""}`} />
                                    </button>
                                </div>
                            }
                        >
                            {school.website_url && (
                                <a
                                    className="text-sm text-primary underline"
                                    href={school.website_url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {t(language, "schools.website")}
                                </a>
                            )}
                            {shortlistMsg && <div className="text-sm text-muted-foreground">{shortlistMsg}</div>}
                        </SchoolRow>
                    </div>
                )}

                {duoMetrics.length ? (
                    <details className="rounded-3xl border bg-card p-4 shadow-sm">
                        <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-foreground">
                            <span>{t(language, "school.facts_title")}</span>
                            {duoMetricsPeriod ? (
                                <span className="text-xs font-normal text-muted-foreground">
                                    {t(language, "school.facts_period").replace("{period}", duoMetricsPeriod)}
                                </span>
                            ) : null}
                        </summary>
                        <div className="mt-4 space-y-5">
                            {pupilItems.length ? (
                                <div className="space-y-2">
                                    <div className="text-sm font-semibold text-foreground">
                                        {t(language, "school.facts_pupils_title")}
                                    </div>
                                    <ul className="space-y-1 text-sm text-muted-foreground">
                                        {pupilItems.map((item) => (
                                            <li key={item.name} className="flex items-center justify-between gap-4">
                                                <span>{item.label}</span>
                                                <span className="font-medium text-foreground">{item.value}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}

                            {examItems.length ? (
                                <div className="space-y-2">
                                    <div className="text-sm font-semibold text-foreground">
                                        {t(language, "school.facts_exams_title")}
                                    </div>
                                    <ul className="space-y-1 text-sm text-muted-foreground">
                                        {examItems.map((item) => (
                                            <li key={item.name} className="flex items-center justify-between gap-4">
                                                <span>{item.label}</span>
                                                <span className="font-medium text-foreground">{item.value}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}

                            <div className="text-xs text-muted-foreground">{t(language, "school.facts_attribution")}</div>
                        </div>
                    </details>
                ) : (
                    <InfoCard title={t(language, "school.facts_title")}>
                        <p className="text-sm text-muted-foreground">{t(language, "school.facts_no_data")}</p>
                    </InfoCard>
                )}

                <InfoCard title={t(language, "school.route_title")}>
                    {routeLoading ? (
                        <p className="text-sm text-muted-foreground">{t(language, "school.route_loading")}</p>
                    ) : route && route.coordinates.length > 1 ? (
                        <div className="space-y-3">
                            <MapboxMap
                                className="h-72"
                                markers={[
                                    ...(typeof school?.lat === "number" && typeof school?.lng === "number"
                                        ? [
                                              {
                                                  id: school.id,
                                                  lat: school.lat,
                                                  lng: school.lng,
                                                  title: school.name,
                                                  href: `/schools/${school.id}`,
                                                  pin: "school" as const,
                                              },
                                          ]
                                        : []),
                                    ...(typeof workspace?.home_lat === "number" && typeof workspace?.home_lng === "number"
                                        ? [
                                              {
                                                  id: "home",
                                                  lat: workspace.home_lat,
                                                  lng: workspace.home_lng,
                                                  title: t(language, "explore.home_pin"),
                                                  pin: "home" as const,
                                              },
                                          ]
                                        : []),
                                ]}
                                route={route}
                                viewLabel={t(language, "explore.map_view_school")}
                            />
                            {destinationAddress ? (
                                <a
                                    className={buttonOutline}
                                    href={googleMapsDirectionsUrl({ origin: homeOrigin, destination: destinationAddress })}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {t(language, "school.route_open_maps")}
                                </a>
                            ) : null}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t(language, "school.route_missing")}</p>
                    )}
                </InfoCard>

                <InfoCard
                    title={t(language, "open_days.title")}
                    action={<span className="text-xs text-muted-foreground">{t(language, "school.detail_verify")}</span>}
                >
                    <div className="mb-3 text-xs text-muted-foreground">{t(language, "open_days.remaining_label")}</div>
                    {openDays.length === 0 ? (
                        <div className="text-sm text-muted-foreground">{t(language, "school.detail_no_open_days")}</div>
                    ) : (
                        <ul className="divide-y rounded-2xl border bg-card">
                            {openDays.map((r) => {
                                const label = eventTypeLabel(r.event_type);
                                const location = stripAnyUrlLabel(r.location_text);
                                const planned = plannedOpenDayIds.has(r.id);
                                const dateLabel = r.starts_at ? fmtDate(r.starts_at, locale) : t(language, "school.detail_unknown_date");
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
                                                {hasSession ? (
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
                                                ) : null}
                                                {hasSession ? (
                                                    <button
                                                        className={actionClass()}
                                                        type="button"
                                                        onClick={() => downloadIcs(r.id)}
                                                        disabled={downloadingId === r.id}
                                                        title={t(language, "open_days.calendar")}
                                                    >
                                                        {downloadingId === r.id
                                                            ? t(language, "open_days.downloading")
                                                            : t(language, "open_days.calendar")}
                                                    </button>
                                                ) : null}
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

                {hasSession ? (
                    <InfoCard title={t(language, "school.notes_title")}>
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-4">
                                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <input
                                        type="checkbox"
                                        checked={attended}
                                        onChange={(e) => setAttended(e.target.checked)}
                                    />
                                    <span>{t(language, "school.notes_visited")}</span>
                                </label>
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <span>{t(language, "school.notes_rating_label")}</span>
                                    <StarRating value={rating} onChange={setRating} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                                    <span>{t(language, "ratings.title")}</span>
                                    <span className="text-xs text-muted-foreground">
                                        ? = {t(language, "ratings.unsure")}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {CATEGORY_KEYS.map((category) => (
                                        <div key={category} className="flex flex-wrap items-center gap-3">
                                            <div className="min-w-[140px] text-sm text-foreground">
                                                {t(language, categoryLabelKey(category))}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {RATING_EMOJIS.map((item) => (
                                                    <button
                                                        key={item.value}
                                                        type="button"
                                                        className={ratingButtonClass(categoryRatings[category] === item.value)}
                                                        onClick={() =>
                                                            setCategoryRatings((prev) => ({
                                                                ...prev,
                                                                [category]: item.value,
                                                            }))
                                                        }
                                                        aria-label={`${t(language, categoryLabelKey(category))} ${item.value}`}
                                                    >
                                                        {item.emoji}
                                                    </button>
                                                ))}
                                                <button
                                                    type="button"
                                                    className={ratingButtonClass(categoryRatings[category] == null)}
                                                    onClick={() =>
                                                        setCategoryRatings((prev) => ({
                                                            ...prev,
                                                            [category]: null,
                                                        }))
                                                    }
                                                >
                                                    ?
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <label className="space-y-2 block">
                                <div className="text-sm font-medium text-foreground">
                                    {t(language, "school.notes_your_notes")}
                                </div>
                                <textarea
                                    className="w-full rounded-2xl border bg-background px-4 py-3 min-h-28 text-sm"
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder={t(language, "school.notes_placeholder")}
                                />
                            </label>

                            {otherNotes.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-foreground">
                                        {t(language, "school.notes_others")}
                                    </div>
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
                                    className={buttonPrimary}
                                    onClick={save}
                                    disabled={!canSave || saving}
                                >
                                    {saving ? "Saving..." : "Save"}
                                </button>
                                {savedMsg && <span className="text-sm text-foreground">{savedMsg}</span>}
                            </div>
                        </div>
                    </InfoCard>
                ) : null}
            </div>
            </section>
        </main>
    );
}
