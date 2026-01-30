"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace, WorkspaceRole } from "@/lib/workspace";
import {
  DEFAULT_LANGUAGE,
  Language,
  LANGUAGE_EVENT,
  emitLanguageChanged,
  readStoredLanguage,
  setStoredLanguage,
  t,
  useIsClient,
} from "@/lib/i18n";
import { ADVIES_OPTIONS, adviesOptionFromLevels } from "@/lib/levels";
import { InfoCard, Wordmark } from "@/components/schoolkeuze";
import { buttonOutline, buttonOutlineWide, buttonPrimary, buttonPrimaryWide, buttonOutlineSmall } from "@/lib/ui";

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
  const isClient = useIsClient();
  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null);
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
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

      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("lang");
      if (fromUrl === "en" || fromUrl === "nl") {
        setLanguage(fromUrl);
        setStoredLanguage(fromUrl);
      } else {
        setLanguage(readStoredLanguage());
      }

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
      const storedLang = readStoredLanguage();
      const wsLang = (ws?.language as Language | null) ?? null;
      if (storedLang && wsLang !== storedLang && ws?.id) {
        await supabase.from("workspaces").update({ language: storedLang }).eq("id", ws.id);
        setLanguage(storedLang);
      } else if (wsLang) {
        setLanguage(wsLang);
      } else {
        setLanguage(storedLang);
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
    setStoredLanguage(language);
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
      <main className="min-h-screen bg-muted/20 px-4 py-8 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {t(isClient ? language : DEFAULT_LANGUAGE, "setup.loading")}
          </p>
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
                <Link className={buttonOutline} href="/">
                  {t(language, "setup.go_dashboard")}
                </Link>
                <button
                  className={buttonOutline}
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
    <main className="min-h-screen bg-muted/20 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Wordmark />
          {isClient && (
            <button
              className={buttonOutlineSmall}
              type="button"
              onClick={() => setLanguage(language === "nl" ? "en" : "nl")}
            >
              {language === "nl" ? "NL" : "EN"}
            </button>
          )}
        </div>

        <section className="rounded-3xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(language, "setup.step_count").replace("{current}", String(stepIndex + 1)).replace("{total}", "3")}
              </div>
              <h1 className="text-3xl font-serif font-semibold text-foreground">{t(language, "setup.title")}</h1>
              <p className="text-sm text-muted-foreground">{t(language, "setup.subtitle")}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
              {stepIndex + 1}/3
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            {["profile", "invite", "tutorial"].map((key, idx) => (
              <span
                key={key}
                className={`rounded-full border px-3 py-1 ${
                  idx <= stepIndex
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-white text-muted-foreground"
                }`}
              >
                {t(language, `setup.step_${key}`)}
              </span>
            ))}
          </div>

          <div className="mt-4 h-1 w-full rounded-full bg-muted">
            <div
              className="h-1 rounded-full bg-primary transition-all"
              style={{ width: `${((stepIndex + 1) / 3) * 100}%` }}
            />
          </div>
        </section>

        <InfoCard
          className="rounded-3xl p-6 shadow-sm"
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

              <div className="space-y-2 rounded-2xl border bg-muted/30 p-4">
                <label className="space-y-1">
                  <div className="text-sm font-medium">{t(language, "setup.invite_label")}</div>
                  <input
                    className="h-11 w-full rounded-2xl border bg-background px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={t(language, "settings.invite_placeholder")}
                  />
                </label>
                <button
                  className={buttonOutlineWide}
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
                  className={buttonOutline}
                  type="button"
                  onClick={() => setStep("tutorial")}
                >
                  {t(language, "setup.skip")}
                </button>
                <button
                  className={buttonPrimary}
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
                  className={buttonPrimary}
                  type="button"
                  onClick={() => router.replace("/how-it-works?from=setup&setup=done")}
                >
                  {t(language, "setup.tutorial_start")}
                </button>
                <button
                  className={buttonOutline}
                  type="button"
                  onClick={() => router.replace("/profile?setup=done")}
                >
                  {t(language, "setup.skip")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="space-y-3 rounded-2xl border bg-muted/30 p-4">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">{t(language, "settings.child_name")}</span>
                  <input
                    className="h-11 w-full rounded-2xl border bg-background px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="Sam"
                  />
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <div className="text-sm font-medium">{t(language, "settings.postcode")}</div>
                    <input
                      className="h-11 w-full rounded-2xl border bg-background px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary"
                      value={homePostcode}
                      onChange={(e) => setHomePostcode(e.target.value)}
                      placeholder="1234 AB"
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="text-sm font-medium">{t(language, "settings.house_number")}</div>
                    <input
                      className="h-11 w-full rounded-2xl border bg-background px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary"
                      value={homeHouseNumber}
                      onChange={(e) => setHomeHouseNumber(e.target.value)}
                      placeholder="10"
                    />
                  </label>
                </div>

                <label className="space-y-1">
                  <div className="text-sm font-medium">{t(language, "settings.advies1")}</div>
                  <select
                    className="h-11 w-full rounded-2xl border bg-background px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary"
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
                className={buttonPrimaryWide}
                onClick={saveSetup}
                disabled={saving}
              >
                {saving ? t(language, "setup.saving") : t(language, "setup.next")}
              </button>
              <button
                className={buttonOutlineWide}
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
