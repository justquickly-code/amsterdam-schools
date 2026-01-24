"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace, WorkspaceRole } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, emitLanguageChanged, t } from "@/lib/i18n";
import { ADVIES_OPTIONS, adviesOptionFromLevels } from "@/lib/levels";
import { InfoCard, Wordmark } from "@/components/schoolkeuze";

type WorkspaceRow = {
  id: string;
  child_name: string | null;
  home_postcode: string | null;
  home_house_number: string | null;
  advies_levels: string[];
  advies_match_mode: "either" | "both";
  language?: Language | null;
};

function normalizePostcode(input: string) {
  return input.toUpperCase().replace(/\s+/g, "").replace(/[^0-9A-Z]/g, "");
}

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null);
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("lang");
    if (fromUrl === "en" || fromUrl === "nl") return fromUrl;
    const stored = window.localStorage.getItem("schools_language");
    return stored === "en" || stored === "nl" ? stored : DEFAULT_LANGUAGE;
  });
  const [step, setStep] = useState<"profile" | "invite" | "tutorial">("profile");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  const [childName, setChildName] = useState("");
  const [homePostcode, setHomePostcode] = useState("");
  const [homeHouseNumber, setHomeHouseNumber] = useState("");
  const [adviesOption, setAdviesOption] = useState("");

  const stepIndex = step === "profile" ? 0 : step === "invite" ? 1 : 2;

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      const { workspace: data, role, error: wErr } = await fetchCurrentWorkspace<WorkspaceRow>(
        "id,child_name,home_postcode,home_house_number,advies_levels,advies_match_mode,language"
      );

      if (!mounted) return;

      if (wErr) {
        setError(wErr);
        setLoading(false);
        return;
      }

      setRole(role ?? null);
      const ws = (data ?? null) as WorkspaceRow | null;
      setWorkspace(ws);
      if (ws?.language) {
        setLanguage(ws.language as Language);
      }
      setChildName(ws?.child_name ?? "");
      const storedPostcode =
        typeof window !== "undefined" ? window.localStorage.getItem("prefill_postcode") ?? "" : "";
      const storedAdvies =
        typeof window !== "undefined" ? window.localStorage.getItem("prefill_advies") ?? "" : "";
      setHomePostcode(ws?.home_postcode ?? storedPostcode);
      setHomeHouseNumber(ws?.home_house_number ?? "");
      const wsAdvies = adviesOptionFromLevels(ws?.advies_levels ?? []);
      setAdviesOption(wsAdvies || storedAdvies);

      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onLang = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next) setLanguage(next);
    };
    window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("schools_language", language);
    emitLanguageChanged(language);
  }, [language]);

  async function inviteMember() {
    if (!workspace) return;
    setInviteBusy(true);
    setInviteMsg("");
    setError("");

    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setInviteMsg(t(language, "setup.invite_invalid"));
      setInviteBusy(false);
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token ?? "";
    if (!token) {
      setInviteMsg(t(language, "setup.invite_auth_required"));
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
          role: "editor",
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setInviteMsg(json?.error ?? t(language, "setup.invite_failed"));
        setInviteBusy(false);
        return;
      }

      if (json?.already_invited) {
        setInviteMsg(t(language, "setup.invite_already_sent"));
      } else {
        setInviteMsg(t(language, "setup.invite_sent"));
      }
      if (typeof window !== "undefined" && workspace?.id) {
        window.localStorage.setItem(`invite_sent_${workspace.id}`, "1");
      }
      setInviteEmail("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t(language, "setup.invite_failed");
      setInviteMsg(msg);
    }

    setInviteBusy(false);
  }

  async function saveSetup() {
    if (!workspace) return;

    setSaving(true);
    setError("");

    const name = childName.trim();
    const postcode = normalizePostcode(homePostcode.trim());
    const house = homeHouseNumber.trim();

    if (!name) {
      setError(t(language, "setup.error_child_required"));
      setSaving(false);
      return;
    }
    if (!postcode || !house) {
      setError(t(language, "setup.error_postcode_house_required"));
      setSaving(false);
      return;
    }
    if (!/^\d{4}[A-Z]{2}$/.test(postcode)) {
      setError(t(language, "setup.error_postcode_format"));
      setSaving(false);
      return;
    }
    const option = ADVIES_OPTIONS.find((opt) => opt.key === adviesOption);
    const levels = option?.levels ?? [];
    if (!levels.length) {
      setError(t(language, "setup.error_advies_required"));
      setSaving(false);
      return;
    }

    const mode: "either" | "both" = "either";

    const { error: upErr } = await supabase
      .from("workspaces")
      .update({
        child_name: name,
        home_postcode: postcode || null,
        home_house_number: house || null,
        advies_levels: levels,
        advies_match_mode: mode,
        language,
      })
      .eq("id", workspace.id);

    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem("setup_completed_at", new Date().toISOString());
      window.localStorage.removeItem("prefill_postcode");
      window.localStorage.removeItem("prefill_advies");
    }

    // Kick off commute compute in background
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      if (!token) return;

      const { data: schools } = await supabase
        .from("schools")
        .select("id,lat,lng")
        .not("lat", "is", null)
        .not("lng", "is", null);

      const schoolIds = (schools ?? [])
        .map((s) => (s as { id: string }).id)
        .filter(Boolean);

      const chunkSize = 20;
      for (let i = 0; i < schoolIds.length; i += chunkSize) {
        const chunk = schoolIds.slice(i, i + chunkSize);
        await fetch("/api/commutes/compute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            workspace_id: workspace.id,
            school_ids: chunk,
            limit: chunk.length,
            force: true,
          }),
        });
      }
    })().catch(() => null);

    setStep("invite");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <p className="text-sm text-muted-foreground">{t(language, "setup.loading")}</p>
        </div>
      </main>
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (role && role !== "owner") {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <InfoCard title={t(language, "setup.required_title")}>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{t(language, "setup.required_body")}</p>
              <div className="flex flex-wrap gap-2">
                <Link className="rounded-full border px-4 py-2 text-xs font-semibold" href="/">
                  {t(language, "setup.go_dashboard")}
                </Link>
                <button
                  className="rounded-full border px-4 py-2 text-xs font-semibold"
                  type="button"
                  onClick={handleSignOut}
                >
                  {t(language, "setup.signout")}
                </button>
              </div>
            </div>
          </InfoCard>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Wordmark />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">{t(language, "setup.title")}</h1>
            <p className="text-sm text-muted-foreground">{t(language, "setup.subtitle")}</p>
          </div>
          <button
            className="rounded-full border px-3 py-1 text-xs"
            type="button"
            onClick={() => setLanguage(language === "nl" ? "en" : "nl")}
          >
            {language === "nl" ? "NL" : "EN"}
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {t(language, "setup.step_count").replace("{current}", String(stepIndex + 1)).replace("{total}", "3")}
          </div>
          <div className="relative">
            <div className="absolute left-4 right-4 top-5 h-0.5 bg-border" />
            <div
              className="absolute left-4 top-5 h-0.5 bg-primary"
              style={{ width: `${(stepIndex / 2) * 100}%` }}
            />
            <div className="flex justify-between text-xs">
              {["profile", "invite", "tutorial"].map((key, idx) => (
                <div key={key} className="flex flex-col items-center gap-2 w-full">
                  <div
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-[11px] ${
                      idx <= stepIndex ? "border-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className={idx <= stepIndex ? "text-primary" : "text-muted-foreground"}>
                    {t(language, `setup.step_${key}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <InfoCard
          title={
            step === "profile"
              ? t(language, "setup.step_profile_title")
              : step === "invite"
              ? t(language, "setup.step_invite_title")
              : t(language, "setup.step_tutorial_title")
          }
        >
          {step === "profile" && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t(language, "setup.intro")}</p>
              <p>{t(language, "setup.profile_why")}</p>
              <p className="text-xs">{t(language, "setup.prefill_hint")}</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {t(language, "setup.error_prefix")} {error}
            </div>
          )}

          {step === "invite" ? (
            <div className="space-y-4 text-sm">
              <div className="space-y-2 text-muted-foreground">
                <p>{t(language, "setup.invite_intro")}</p>
                <p>{t(language, "setup.invite_shared")}</p>
              </div>

              <div className="space-y-2">
                <label className="space-y-1">
                  <div className="text-sm font-medium">{t(language, "setup.invite_label")}</div>
                  <input
                    className="w-full rounded-2xl border bg-background px-4 py-2"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={t(language, "settings.invite_placeholder")}
                  />
                </label>
                <button
                  className="w-full rounded-full border px-4 py-2 text-xs font-semibold"
                  onClick={inviteMember}
                  disabled={inviteBusy || !inviteEmail.trim()}
                >
                  {inviteBusy ? t(language, "setup.invite_sending") : t(language, "setup.invite_send")}
                </button>
                {inviteMsg && <div className="text-sm text-muted-foreground">{inviteMsg}</div>}
              </div>

              <div className="text-xs text-muted-foreground">{t(language, "setup.invite_later")}</div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full border px-4 py-2 text-xs font-semibold"
                  type="button"
                  onClick={() => setStep("tutorial")}
                >
                  {t(language, "setup.skip")}
                </button>
                <button
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  type="button"
                  onClick={() => setStep("tutorial")}
                >
                  {t(language, "setup.continue")}
                </button>
              </div>
            </div>
          ) : step === "tutorial" ? (
            <div className="space-y-4 text-sm">
              <div className="space-y-2 text-muted-foreground">
                <p>{t(language, "setup.tutorial_intro")}</p>
                <p>{t(language, "setup.tutorial_body")}</p>
              </div>
              <div className="text-xs text-muted-foreground">{t(language, "setup.tutorial_later")}</div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  type="button"
                  onClick={() => router.replace("/how-it-works?from=setup&setup=done")}
                >
                  {t(language, "setup.tutorial_start")}
                </button>
                <button
                  className="rounded-full border px-4 py-2 text-xs font-semibold"
                  type="button"
                  onClick={() => router.replace("/profile?setup=done")}
                >
                  {t(language, "setup.skip")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t(language, "settings.child_name")}</span>
                <input
                  className="w-full rounded-2xl border bg-background px-4 py-2"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Sam"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <div className="text-sm font-medium">{t(language, "settings.postcode")}</div>
                  <input
                    className="w-full rounded-2xl border bg-background px-4 py-2"
                    value={homePostcode}
                    onChange={(e) => setHomePostcode(e.target.value)}
                    placeholder="1234 AB"
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-sm font-medium">{t(language, "settings.house_number")}</div>
                  <input
                    className="w-full rounded-2xl border bg-background px-4 py-2"
                    value={homeHouseNumber}
                    onChange={(e) => setHomeHouseNumber(e.target.value)}
                    placeholder="10"
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

              <button
                className="w-full rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                onClick={saveSetup}
                disabled={saving}
              >
                {saving ? t(language, "setup.saving") : t(language, "setup.next")}
              </button>
              <button
                className="w-full rounded-full border px-4 py-2 text-xs font-semibold"
                type="button"
                onClick={handleSignOut}
              >
                {t(language, "setup.signout")}
              </button>
            </div>
          )}
        </InfoCard>
      </div>
    </main>
  );
}
