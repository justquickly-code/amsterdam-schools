"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace, WorkspaceRole } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { ADVIES_OPTIONS, adviesOptionFromLevels } from "@/lib/levels";
import { InfoCard, Wordmark } from "@/components/schoolkeuze";

type Workspace = {
    id: string;
    name: string;
    child_name: string | null;
    home_postcode: string | null;
    home_house_number: string | null;
    advies_levels: string[];
    advies_match_mode: "either" | "both";
    language?: Language | null;
};

type WorkspaceRow = {
    id: string;
    name: string;
    child_name: string | null;
    home_postcode: string | null;
    home_house_number: string | null;
    advies_levels: string[];
    advies_match_mode: "either" | "both";
    language?: Language | null;
};

type WorkspaceMemberRow = {
    user_id: string;
    role: "owner" | "editor" | "viewer";
    member_email: string | null;
};

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [error, setError] = useState<string>("");
    const [homePostcode, setHomePostcode] = useState("");
    const [homeHouseNumber, setHomeHouseNumber] = useState("");
    const [childName, setChildName] = useState("");
    const [adviesOption, setAdviesOption] = useState("");
    const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");
    const [commuteMsg, setCommuteMsg] = useState("");
    const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole] = useState<"editor">("editor");
    const [inviteMsg, setInviteMsg] = useState("");
    const [inviteBusy, setInviteBusy] = useState(false);
    const [role, setRole] = useState<WorkspaceRole | null>(null);
    const [availableWorkspaces, setAvailableWorkspaces] = useState<Array<{ id: string; name: string }>>([]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState("");

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
                setError(t(language, "settings.error_not_signed_in"));
                setLoading(false);
                return;
            }
            setCurrentUserId(session.session.user.id);

            const activeId =
                typeof window !== "undefined" ? window.localStorage.getItem("active_workspace_id") ?? "" : "";

            const { workspace: data, role, error } = await fetchCurrentWorkspace<WorkspaceRow>(
                "id,name,child_name,home_postcode,home_house_number,advies_levels,advies_match_mode,language"
            );

            if (!mounted) return;

            if (error) {
                setError(error);
                setWorkspace(null);
            } else {
                const ws = (data ?? null) as WorkspaceRow | null;
                setWorkspace(ws);

                setChildName(ws?.child_name ?? "");
                setHomePostcode(ws?.home_postcode ?? "");
                setHomeHouseNumber(ws?.home_house_number ?? "");

                const levels = ws?.advies_levels ?? [];
                setAdviesOption(adviesOptionFromLevels(levels));
                setLanguage((ws?.language as Language) ?? readStoredLanguage());
            }

            setRole(role ?? null);
            if (data?.id) {
                setActiveWorkspaceId(activeId || data.id);
            }

            const { data: membershipRows } = await supabase
                .from("workspace_members")
                .select("workspace:workspaces(id,name)")
                .eq("user_id", session.session.user.id)
                .order("created_at", { ascending: true });

            const workspaceList =
                (membershipRows ?? [])
                    .map((row) => {
                        const ws = Array.isArray(row.workspace) ? row.workspace[0] : row.workspace;
                        if (!ws) return null;
                        return { id: ws.id as string, name: (ws.name as string) || t(language, "settings.workspace_fallback") };
                    })
                    .filter(Boolean) as Array<{ id: string; name: string }>;

            setAvailableWorkspaces(workspaceList);

            if (data?.id) {
                const { data: memberRows, error: mErr } = await supabase
                    .from("workspace_members")
                    .select("user_id,role,member_email")
                    .eq("workspace_id", data.id)
                    .order("created_at", { ascending: true });

                if (!mounted) return;
                if (mErr) {
                    setError(mErr.message);
                } else {
                    setMembers((memberRows ?? []) as WorkspaceMemberRow[]);
                }
            }

            setLoading(false);
        }

        load();

        function onLang(e: Event) {
            const next = (e as CustomEvent<Language>).detail;
            if (next) setLanguage(next);
        }
        window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);

        return () => {
            mounted = false;
            window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
        };
    }, [language]);

    async function saveSettings() {
        if (!workspace) return;
        if (!isOwner) {
            setError(t(language, "settings.error_owner_only"));
            return;
        }

        setSaving(true);
        setSavedMsg("");
        setError("");

        const name = childName.trim();
        const postcode = normalizePostcode(homePostcode.trim());
        const house = homeHouseNumber.trim();
        const prevPostcode = normalizePostcode((workspace.home_postcode ?? "").trim());
        const prevHouse = (workspace.home_house_number ?? "").trim();
        const addressChanged = postcode !== prevPostcode || house !== prevHouse;

        // basic validation (MVP)
        if (!name) {
            setError(t(language, "settings.error_child_required"));
            setSaving(false);
            return;
        }
        if (postcode && !/^\d{4}[A-Z]{2}$/.test(postcode)) {
            setError(t(language, "settings.error_postcode_format"));
            setSaving(false);
            return;
        }
        if ((postcode && !house) || (!postcode && house)) {
            setError(t(language, "settings.error_postcode_house_together"));
            setSaving(false);
            return;
        }

        const option = ADVIES_OPTIONS.find((opt) => opt.key === adviesOption);
        const levels = option?.levels ?? [];
        if (!levels.length) {
            setError(t(language, "settings.error_advies_required"));
            setSaving(false);
            return;
        }
        const mode: "either" | "both" = "either";

        setHomePostcode(postcode);

        const { error } = await supabase
            .from("workspaces")
            .update({
                child_name: name,
                home_postcode: postcode || null,
                home_house_number: house || null,
                ...(addressChanged ? { home_lat: null, home_lng: null } : {}),
                advies_levels: levels,
                advies_match_mode: mode,
                language,
            })
            .eq("id", workspace.id);

        if (error) {
            setError(error.message);
        } else {
            setSavedMsg(t(language, "settings.saved"));
            setCommuteMsg("");
            // Reload workspace to reflect saved values
            const { data: refreshed } = await supabase
                .from("workspaces")
                .select("id,name,child_name,home_postcode,home_house_number,advies_levels,advies_match_mode,language")
                .eq("id", workspace.id)
                .maybeSingle();
            setWorkspace((refreshed ?? null) as WorkspaceRow | null);

            if (addressChanged) {
                const { error: delErr } = await supabase
                    .from("commute_cache")
                    .delete()
                    .eq("workspace_id", workspace.id);
                if (delErr) {
                    setCommuteMsg(t(language, "settings.commute_clear_fail"));
                }
            }

            if (postcode && house) {
                setCommuteMsg(t(language, "settings.commute_updating"));
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
                        setCommuteMsg(t(language, "settings.commute_up_to_date"));
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
                                    ? t(language, "settings.commute_update_issue").replace("{error}", String(json.sample_errors[0].error))
                                    : t(language, "settings.commute_update_issue_generic")
                            );
                            return;
                        }
                    }

                    setCommuteMsg(t(language, "settings.commute_updated"));
                })().catch(() => null);
            }
        }

        setSaving(false);
    }

    async function inviteMember() {
        if (!workspace) return;
        setInviteBusy(true);
        setInviteMsg("");
        setError("");

        const email = inviteEmail.trim().toLowerCase();
        if (!email || !email.includes("@")) {
            setInviteMsg(t(language, "settings.invite_invalid_email"));
            setInviteBusy(false);
            return;
        }

        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token ?? "";
        if (!token) {
            setInviteMsg(t(language, "settings.invite_auth_required"));
            setInviteBusy(false);
            return;
        }

        try {
            const res = await fetch("/api/workspaces/invite", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    workspace_id: workspace.id,
                    email,
                    role: inviteRole,
                }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
                setInviteMsg(json?.error ?? t(language, "settings.invite_failed"));
                setInviteBusy(false);
                return;
            }

            if (json?.already_invited) {
                setInviteMsg(t(language, "settings.invite_already_sent"));
            } else {
                setInviteMsg(t(language, "settings.invite_sent"));
            }
            setInviteEmail("");

            const { data: memberRows } = await supabase
                .from("workspace_members")
                .select("user_id,role,member_email")
                .eq("workspace_id", workspace.id)
                .order("created_at", { ascending: true });
            setMembers((memberRows ?? []) as WorkspaceMemberRow[]);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : t(language, "settings.invite_failed");
            setInviteMsg(msg);
        }

        setInviteBusy(false);
    }

    const isOwner = role === "owner";

    return (
        <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-4xl space-y-6">
                <header className="flex flex-col gap-2">
                    <Wordmark />
                    <Link className="text-sm font-semibold text-primary hover:underline" href="/profile">
                        ← {t(language, "about.back")}
                    </Link>
                    <h1 className="text-3xl font-serif font-semibold text-foreground">{t(language, "settings.title")}</h1>
                </header>

                {loading && <p className="text-sm text-muted-foreground">{t(language, "settings.loading")}</p>}

                {!loading && error && (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {t(language, "settings.error_prefix")} {error}
                    </div>
                )}

                {!loading && !error && !workspace && (
                    <InfoCard title={t(language, "settings.title")}>
                        <p className="text-sm text-muted-foreground">{t(language, "settings.no_workspace")}</p>
                    </InfoCard>
                )}

                {!loading && workspace && (
                    <div className="space-y-6">
                        <InfoCard title={t(language, "settings.edit")}>
                            <div className="space-y-4 text-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className="space-y-1 sm:col-span-2">
                                        <div className="text-sm font-medium">{t(language, "settings.child_name")}</div>
                                        <input
                                            className="w-full rounded-2xl border bg-background px-4 py-2"
                                            value={childName}
                                            onChange={(e) => setChildName(e.target.value)}
                                            placeholder={t(language, "settings.child_placeholder")}
                                            disabled={!isOwner}
                                        />
                                    </label>

                                    <label className="space-y-1">
                                        <div className="text-sm font-medium">{t(language, "settings.postcode")}</div>
                                        <input
                                            className="w-full rounded-2xl border bg-background px-4 py-2"
                                            value={homePostcode}
                                            onChange={(e) => setHomePostcode(e.target.value)}
                                            placeholder={t(language, "settings.postcode_placeholder")}
                                            disabled={!isOwner}
                                        />
                                    </label>

                                    <label className="space-y-1">
                                        <div className="text-sm font-medium">{t(language, "settings.house_number")}</div>
                                        <input
                                            className="w-full rounded-2xl border bg-background px-4 py-2"
                                            value={homeHouseNumber}
                                            onChange={(e) => setHomeHouseNumber(e.target.value)}
                                            placeholder={t(language, "settings.house_placeholder")}
                                            disabled={!isOwner}
                                        />
                                    </label>
                                </div>

                                <div className="space-y-2">
                                    <label className="space-y-1">
                                        <div className="text-sm font-medium">{t(language, "settings.advies1")}</div>
                                        <select
                                            className="w-full rounded-2xl border bg-background px-4 py-2"
                                            value={adviesOption}
                                            onChange={(e) => setAdviesOption(e.target.value)}
                                            disabled={!isOwner}
                                        >
                                            <option value="">{t(language, "settings.advies_select")}</option>
                                            {ADVIES_OPTIONS.map((opt) => (
                                                <option key={opt.key} value={opt.key}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
                                        onClick={saveSettings}
                                        disabled={saving || !isOwner}
                                    >
                                        {saving ? t(language, "settings.saving") : t(language, "settings.save")}
                                    </button>
                                    {savedMsg && <span className="text-sm text-foreground">{savedMsg}</span>}
                                    {commuteMsg && <span className="text-sm text-muted-foreground">{commuteMsg}</span>}
                                </div>

                                <p className="text-sm text-muted-foreground">
                                    {t(language, "settings.next_tip")}
                                </p>
                            </div>
                        </InfoCard>

                        <InfoCard title={t(language, "settings.members_title")}>
                            <div className="space-y-4 text-sm">
                                {availableWorkspaces.length > 1 && (
                                    <div className="space-y-1">
                                        <div className="text-xs text-muted-foreground">{t(language, "settings.current_workspace")}</div>
                                        <select
                                            className="w-full rounded-2xl border bg-background px-4 py-2 text-sm"
                                            value={activeWorkspaceId}
                                            onChange={(e) => {
                                                const next = e.target.value;
                                                setActiveWorkspaceId(next);
                                                if (typeof window !== "undefined") {
                                                    window.localStorage.setItem("active_workspace_id", next);
                                                    window.location.assign("/settings");
                                                }
                                            }}
                                        >
                                            {availableWorkspaces.map((ws) => (
                                                <option key={ws.id} value={ws.id}>
                                                    {ws.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {members.length === 0 ? (
                                    <p className="text-muted-foreground">{t(language, "settings.no_members")}</p>
                                ) : (
                                    <ul className="divide-y rounded-2xl border bg-card">
                                        {members.map((m) => (
                                            <li key={m.user_id} className="flex items-center justify-between p-4">
                                                <div>
                                                    <div className="font-medium text-foreground">
                                                        {m.member_email ?? t(language, "settings.member_fallback")}
                                                        {m.user_id === currentUserId ? ` ${t(language, "settings.member_you")}` : ""}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{m.role}</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {isOwner ? (
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">{t(language, "settings.invite_title")}</div>
                                        <input
                                            className="w-full rounded-2xl border bg-background px-4 py-2"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder={t(language, "settings.invite_placeholder")}
                                        />
                                        <div className="text-xs text-muted-foreground">
                                            {t(language, "settings.invite_role")}
                                        </div>
                                        <button
                                            className="rounded-full border px-4 py-2 text-xs font-semibold"
                                            onClick={inviteMember}
                                            disabled={inviteBusy || !inviteEmail.trim()}
                                        >
                                            {inviteBusy ? t(language, "settings.invite_busy") : t(language, "settings.invite_button")}
                                        </button>
                                        {inviteMsg && <div className="text-sm text-muted-foreground">{inviteMsg}</div>}
                                        <div className="text-xs text-muted-foreground">
                                            {t(language, "settings.invite_info")}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground">
                                        {t(language, "settings.invite_owner_only")}
                                    </div>
                                )}
                            </div>
                        </InfoCard>
                    </div>
                )}
            </div>
        </main>
    );
}
