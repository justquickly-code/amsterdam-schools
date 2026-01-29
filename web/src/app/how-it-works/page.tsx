"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { formatDateRange, getNextTimelineItems, KEUZEGIDS_TIMELINE_2025_26 } from "@/lib/keuzegidsTimeline";
import { InfoCard, Wordmark } from "@/components/schoolkeuze";

type WorkspaceRow = { id: string; language?: Language | null };

type MemberRow = { tutorial_completed_at: string | null };

export default function HowItWorksPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fromSetup = params.get("from") === "setup";

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { workspace } = await fetchCurrentWorkspace<WorkspaceRow>("id,language");
      if (!mounted) return;
      setWorkspaceId(workspace?.id ?? null);
      setLanguage((workspace?.language as Language) ?? readStoredLanguage());

      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id ?? "";
      if (!userId || !workspace?.id) return;
      const { data: member } = await supabase
        .from("workspace_members")
        .select("tutorial_completed_at")
        .eq("workspace_id", workspace.id)
        .eq("user_id", userId)
        .maybeSingle();
      const row = (member ?? null) as MemberRow | null;
      if (!mounted) return;
      setCompletedAt(row?.tutorial_completed_at ?? null);
    })().catch(() => null);

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

  const locale = useMemo(() => (language === "nl" ? "nl-NL" : "en-GB"), [language]);
  const nextDates = useMemo(() => getNextTimelineItems(new Date(), 2), []);

  async function markComplete() {
    if (!workspaceId) return;
    setSaving(true);
    setError("");

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id ?? "";
    if (!userId) {
      setError("Not signed in.");
      setSaving(false);
      return;
    }

    const now = new Date().toISOString();
    const { error: upErr } = await supabase
      .from("workspace_members")
      .update({ tutorial_completed_at: now })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    if (upErr) setError(upErr.message);
    else setCompletedAt(now);

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-col gap-2">
          <Wordmark />
          <h1 className="text-3xl font-serif font-semibold text-foreground">{t(language, "how.title")}</h1>
          <p className="text-sm text-muted-foreground">{t(language, "how.subtitle")}</p>
        </header>

        {nextDates.length ? (
          <InfoCard title={t(language, "how.next_title")}>
            <ul className="text-sm text-muted-foreground space-y-1">
              {nextDates.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span>{t(language, item.titleKey)}</span>
                  <span>{formatDateRange(item, locale)}</span>
                </li>
              ))}
            </ul>
          </InfoCard>
        ) : null}

        <div className="space-y-3">
          {KEUZEGIDS_TIMELINE_2025_26.map((item) => (
            <InfoCard key={item.id} title={t(language, item.titleKey)}>
              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>{formatDateRange(item, locale)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t(language, item.bodyKey)}</p>
            </InfoCard>
          ))}
        </div>

        <InfoCard title={t(language, "how.list_title")}>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">{t(language, "how.list_intro")}</div>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>{t(language, "how.list_4")}</li>
              <li>{t(language, "how.list_6")}</li>
              <li>{t(language, "how.list_12")}</li>
            </ul>
            <div className="text-xs text-muted-foreground">{t(language, "how.list_note")}</div>
          </div>
        </InfoCard>

        {error ? <div className="text-sm text-red-600">Error: {error}</div> : null}

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
            type="button"
            onClick={async () => {
              if (!completedAt) await markComplete();
              if (fromSetup) router.replace("/profile?setup=done");
              else router.push("/");
            }}
            disabled={saving}
          >
            {completedAt ? t(language, "how.completed") : t(language, "how.complete_cta")}
          </button>
        </div>
      </div>
    </main>
  );
}
