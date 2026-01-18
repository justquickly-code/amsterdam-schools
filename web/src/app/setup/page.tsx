"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace, WorkspaceRole } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, t } from "@/lib/i18n";

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
  const [saved, setSaved] = useState(false);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  const [childName, setChildName] = useState("");
  const [homePostcode, setHomePostcode] = useState("");
  const [homeHouseNumber, setHomeHouseNumber] = useState("");
  const [advies1, setAdvies1] = useState("");
  const [advies2, setAdvies2] = useState("");
  const [matchMode, setMatchMode] = useState<"either" | "both">("either");

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
      setLanguage((ws?.language as Language) ?? DEFAULT_LANGUAGE);
      setChildName(ws?.child_name ?? "");
      setHomePostcode(ws?.home_postcode ?? "");
      setHomeHouseNumber(ws?.home_house_number ?? "");
      setAdvies1(ws?.advies_levels?.[0] ?? "");
      setAdvies2(ws?.advies_levels?.[1] ?? "");
      setMatchMode(ws?.advies_match_mode ?? "either");

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
    if (!saved) return;
    const timer = window.setTimeout(() => {
      router.replace("/");
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [saved, router]);

  async function saveSetup() {
    if (!workspace) return;

    setSaving(true);
    setError("");

    const name = childName.trim();
    const postcode = normalizePostcode(homePostcode.trim());
    const house = homeHouseNumber.trim();

    if (!name) {
      setError("Please enter a child name.");
      setSaving(false);
      return;
    }
    if (!postcode || !house) {
      setError("Postcode and house number are required.");
      setSaving(false);
      return;
    }
    if (!/^\d{4}[A-Z]{2}$/.test(postcode)) {
      setError("Postcode must look like 1234AB.");
      setSaving(false);
      return;
    }
    const levels = [advies1.trim(), advies2.trim()].filter(Boolean);
    if (!levels.length) {
      setError("Please choose at least one advies level.");
      setSaving(false);
      return;
    }

    const mode: "either" | "both" = levels.length === 2 ? matchMode : "either";

    const { error: upErr } = await supabase
      .from("workspaces")
      .update({
        child_name: name,
        home_postcode: postcode || null,
        home_house_number: house || null,
        advies_levels: levels,
        advies_match_mode: mode,
      })
      .eq("id", workspace.id);

    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
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

    setSaved(true);
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm">Loading…</p>
      </main>
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (role && role !== "owner") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border p-6 space-y-3 text-sm">
          <h1 className="text-2xl font-semibold">{t(language, "setup.required_title")}</h1>
          <p className="text-muted-foreground">{t(language, "setup.required_body")}</p>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-block rounded-md border px-3 py-2" href="/">
              {t(language, "setup.go_dashboard")}
            </Link>
            <button
              className="rounded-md border px-3 py-2 text-sm"
              type="button"
              onClick={handleSignOut}
            >
              {t(language, "setup.signout")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-6 space-y-4">
        <h1 className="text-2xl font-semibold">{t(language, "setup.title")}</h1>
        {!saved && (
          <p className="text-sm text-muted-foreground">{t(language, "setup.intro")}</p>
        )}

        {error && <p className="text-sm text-red-600">Error: {error}</p>}

        {saved ? (
          <div className="space-y-3">
            <div className="text-sm">
              {t(language, "setup.thanks")}, {childName}! 🎉
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="inline-block rounded-md border px-3 py-2" href="/">
                {t(language, "setup.go_dashboard")}
              </Link>
              <button
                className="rounded-md border px-3 py-2 text-sm"
                type="button"
                onClick={handleSignOut}
              >
                {t(language, "setup.signout")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t(language, "settings.child_name")}</span>
              <input
                className="w-full rounded-md border px-3 py-2"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="Sam"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <div className="text-sm font-medium">{t(language, "settings.postcode")}</div>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={homePostcode}
                  onChange={(e) => setHomePostcode(e.target.value)}
                  placeholder="1234 AB"
                />
              </label>

              <label className="space-y-1">
                <div className="text-sm font-medium">{t(language, "settings.house_number")}</div>
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
                <div className="text-sm font-medium">{t(language, "settings.advies1")}</div>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={advies1}
                  onChange={(e) => setAdvies1(e.target.value)}
                  placeholder="havo"
                />
              </label>

              <label className="space-y-1">
                <div className="text-sm font-medium">{t(language, "settings.advies2")}</div>
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
                <span>{t(language, "settings.both_levels")}</span>
              </label>
            )}

            <button
              className="w-full rounded-md border px-3 py-2"
              onClick={saveSetup}
              disabled={saving}
            >
              {saving ? t(language, "setup.saving") : t(language, "setup.finish")}
            </button>
            <button
              className="w-full rounded-md border px-3 py-2 text-sm"
              type="button"
              onClick={handleSignOut}
            >
              {t(language, "setup.signout")}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
