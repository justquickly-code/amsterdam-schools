"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace, WorkspaceRole } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, t } from "@/lib/i18n";

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
    const [advies1, setAdvies1] = useState("");
    const [advies2, setAdvies2] = useState("");
    const [matchMode, setMatchMode] = useState<"either" | "both">("either");
    const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");
    const [commuteMsg, setCommuteMsg] = useState("");
    const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
    const [inviteMsg, setInviteMsg] = useState("");
    const [inviteBusy, setInviteBusy] = useState(false);
    const [role, setRole] = useState<WorkspaceRole | null>(null);

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
            setCurrentUserId(session.session.user.id);

            const { workspace: data, role, error } = await fetchCurrentWorkspace<WorkspaceRow>(
                "id,name,child_name,home_postcode,home_house_number,advies_levels,advies_match_mode,language"
            );

            if (!mounted) return;

            if (error) {
                setError(error.message);
                setWorkspace(null);
            } else {
                const ws = (data ?? null) as WorkspaceRow | null;
                setWorkspace(ws);

                setChildName(ws?.child_name ?? "");
                setHomePostcode(ws?.home_postcode ?? "");
                setHomeHouseNumber(ws?.home_house_number ?? "");

                const levels = ws?.advies_levels ?? [];
                setAdvies1(levels?.[0] ?? "");
                setAdvies2(levels?.[1] ?? "");
                setMatchMode(ws?.advies_match_mode ?? "either");
                setLanguage((ws?.language as Language) ?? DEFAULT_LANGUAGE);
            }

            setRole(role ?? null);

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
    }, []);

    async function saveSettings() {
        if (!workspace) return;
        if (!isOwner) {
            setError("Only the workspace owner can edit settings.");
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
            setError("Child name is required.");
            setSaving(false);
            return;
        }
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
            setSavedMsg("Saved.");
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

    async function inviteMember() {
        if (!workspace) return;
        setInviteBusy(true);
        setInviteMsg("");
        setError("");

        const email = inviteEmail.trim().toLowerCase();
        if (!email || !email.includes("@")) {
            setInviteMsg("Enter a valid email address.");
            setInviteBusy(false);
            return;
        }

        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token ?? "";
        if (!token) {
            setInviteMsg("You must be signed in.");
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
                setInviteMsg(json?.error ?? "Invite failed.");
                setInviteBusy(false);
                return;
            }

            if (json?.already_invited) {
                setInviteMsg("Invite already sent.");
            } else {
                setInviteMsg("Invite sent.");
            }
            setInviteEmail("");

            const { data: memberRows } = await supabase
                .from("workspace_members")
                .select("user_id,role,member_email")
                .eq("workspace_id", workspace.id)
                .order("created_at", { ascending: true });
            setMembers((memberRows ?? []) as WorkspaceMemberRow[]);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Invite failed.";
            setInviteMsg(msg);
        }

        setInviteBusy(false);
    }

    const isOwner = role === "owner";

    return (
        <main className="min-h-screen p-6 flex items-start justify-center">
            <div className="w-full max-w-xl rounded-xl border p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">{t(language, "settings.title")}</h1>
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
                        <div className="space-y-4">
                            <h2 className="text-base font-semibold">{t(language, "settings.edit")}</h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="space-y-1 sm:col-span-2">
                                    <div className="text-sm font-medium">{t(language, "settings.child_name")}</div>
                                    <input
                                        className="w-full rounded-md border px-3 py-2"
                                        value={childName}
                                        onChange={(e) => setChildName(e.target.value)}
                                        placeholder="Sam (child)"
                                        disabled={!isOwner}
                                    />
                                </label>

                                <label className="space-y-1">
                                    <div className="text-sm font-medium">{t(language, "settings.postcode")}</div>
                                    <input
                                        className="w-full rounded-md border px-3 py-2"
                                        value={homePostcode}
                                        onChange={(e) => setHomePostcode(e.target.value)}
                                        placeholder="1234 AB"
                                        disabled={!isOwner}
                                    />
                                </label>

                                <label className="space-y-1">
                                    <div className="text-sm font-medium">{t(language, "settings.house_number")}</div>
                                    <input
                                        className="w-full rounded-md border px-3 py-2"
                                        value={homeHouseNumber}
                                        onChange={(e) => setHomeHouseNumber(e.target.value)}
                                        placeholder="10"
                                        disabled={!isOwner}
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="space-y-1">
                                    <div className="text-sm font-medium">{t(language, "settings.advies1")}</div>
                                    <input
                                        className="w-full rounded-md border px-3 py-2"
                                        value={advies1}
                                        onChange={(e) => setAdvies1(e.target.value)}
                                        placeholder="havo"
                                        disabled={!isOwner}
                                    />
                                </label>

                                <label className="space-y-1">
                                    <div className="text-sm font-medium">{t(language, "settings.advies2")}</div>
                                    <input
                                        className="w-full rounded-md border px-3 py-2"
                                        value={advies2}
                                        onChange={(e) => setAdvies2(e.target.value)}
                                        placeholder="vwo"
                                        disabled={!isOwner}
                                    />
                                </label>
                            </div>

                            {Boolean(advies1.trim()) && Boolean(advies2.trim()) && (
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={matchMode === "both"}
                                        onChange={(e) => setMatchMode(e.target.checked ? "both" : "either")}
                                        disabled={!isOwner}
                                    />
                                    <span>{t(language, "settings.both_levels")}</span>
                                </label>
                            )}

                            <div className="flex items-center gap-3">
                                <button
                                    className="rounded-md border px-3 py-2"
                                    onClick={saveSettings}
                                    disabled={saving || !isOwner}
                                >
                                    {saving ? t(language, "settings.saving") : t(language, "settings.save")}
                                </button>
                                {savedMsg && <span className="text-green-700">{savedMsg}</span>}
                                {commuteMsg && <span className="text-muted-foreground">{commuteMsg}</span>}
                            </div>

                            <p className="text-muted-foreground">
                                Next: we’ll use these settings to filter schools and calculate cycling
                                time/distance.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-base font-semibold">Workspace members</h2>
                            <div className="space-y-2 text-sm">
                                {members.length === 0 ? (
                                    <p className="text-muted-foreground">No members found.</p>
                                ) : (
                                    <ul className="divide-y rounded-lg border">
                                        {members.map((m) => (
                                            <li key={m.user_id} className="flex items-center justify-between p-3">
                                                <div>
                                                    <div className="font-medium">
                                                        {m.member_email ?? "Member"}
                                                        {m.user_id === currentUserId ? " (you)" : ""}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{m.role}</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {isOwner ? (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">Invite a member</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                                        <input
                                            className="w-full rounded-md border px-3 py-2"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="parent@example.com"
                                        />
                                        <select
                                            className="rounded-md border px-3 py-2 text-sm"
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                                        >
                                            <option value="editor">Editor</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                    </div>
                                    <button
                                        className="rounded-md border px-3 py-2"
                                        onClick={inviteMember}
                                        disabled={inviteBusy || !inviteEmail.trim()}
                                    >
                                        {inviteBusy ? "Inviting..." : "Invite"}
                                    </button>
                                    {inviteMsg && <div className="text-sm text-muted-foreground">{inviteMsg}</div>}
                                    <div className="text-xs text-muted-foreground">
                                        We’ll email a link to join this workspace.
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground">
                                    Only workspace owners can edit settings or invite members.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
