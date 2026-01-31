"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { InfoCard } from "@/components/schoolkeuze";
import { buttonPrimary } from "@/lib/ui";
import { badgeNeutral } from "@/lib/badges";

type WorkspaceRow = { id: string; language?: Language | null };

type FeedbackRow = {
  id: string;
  category: "bug" | "idea" | "question" | "compliment" | "other";
  title: string | null;
  body: string;
  admin_response: string | null;
  admin_responded_at: string | null;
  created_at: string;
};

const CATEGORY_OPTIONS: Array<{ value: FeedbackRow["category"]; labelKey: string }> = [
  { value: "bug", labelKey: "feedback.category_bug" },
  { value: "idea", labelKey: "feedback.category_idea" },
  { value: "question", labelKey: "feedback.category_question" },
  { value: "compliment", labelKey: "feedback.category_compliment" },
  { value: "other", labelKey: "feedback.category_other" },
];

export default function FeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [error, setError] = useState("");
  const [category, setCategory] = useState<FeedbackRow["category"]>("bug");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

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

      const { workspace, error: wErr } = await fetchCurrentWorkspace<WorkspaceRow>("id,language");
      if (!mounted) return;

      if (wErr || !workspace) {
        setError(wErr ?? "No workspace found.");
        setLoading(false);
        return;
      }

      setWorkspaceId(workspace.id);
      setLanguage((workspace.language as Language) ?? readStoredLanguage());

      const { data: rows, error: fErr } = await supabase
        .from("feedback")
        .select("id,category,title,body,admin_response,admin_responded_at,created_at")
        .eq("user_id", session.session.user.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (fErr) {
        setError(fErr.message);
        setLoading(false);
        return;
      }

      setItems((rows ?? []) as FeedbackRow[]);

      const { data: memberRow } = await supabase
        .from("workspace_members")
        .select("feedback_last_seen_at")
        .eq("workspace_id", workspace.id)
        .eq("user_id", session.session.user.id)
        .maybeSingle();

      setLastSeenAt(memberRow?.feedback_last_seen_at ?? null);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    if (items.length === 0) return;
    const latestResponse = items
      .map((item) => item.admin_responded_at)
      .filter(Boolean)
      .sort()
      .slice(-1)[0];
    if (!latestResponse) return;
    const lastSeen = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
    const latest = new Date(latestResponse as string).getTime();
    if (latest <= lastSeen) return;

    (async () => {
      await supabase
        .from("workspace_members")
        .update({ feedback_last_seen_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId)
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");
    })().catch(() => null);
  }, [items, lastSeenAt, workspaceId]);

  useEffect(() => {
    const onLang = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next) setLanguage(next);
    };
    window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
  }, []);

  async function submit() {
    if (!workspaceId) return;
    setError("");
    setMessage("");

    const trimmed = body.trim();
    if (!trimmed) {
      setError("Please add a message.");
      return;
    }

    setSending(true);
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id ?? "";
    if (!userId) {
      setError("Not signed in.");
      setSending(false);
      return;
    }

    const { data, error: insErr } = await supabase
      .from("feedback")
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        category,
        title: title.trim() || null,
        body: trimmed,
      })
      .select("id,category,title,body,admin_response,admin_responded_at,created_at")
      .maybeSingle();

    if (insErr || !data) {
      setError(insErr?.message ?? "Could not send feedback.");
      setSending(false);
      return;
    }

    setItems((prev) => [data as FeedbackRow, ...prev]);
    setTitle("");
    setBody("");
      setMessage(t(language, "feedback.thanks"));
    setSending(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <header className="relative -mt-4 overflow-hidden min-h-[260px] md:min-h-[320px]">
        <div className="absolute inset-0">
          <Image src="/branding/hero/hero-bg.jpg" alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
        </div>
        <div className="relative px-4 pt-10 pb-12 sm:px-6">
          <div className="mx-auto w-full max-w-4xl">
            <h1 className="text-3xl font-serif font-semibold text-white drop-shadow-sm">{t(language, "feedback.title")}</h1>
            <p className="mt-2 text-sm text-white/90">{t(language, "feedback.subtitle")}</p>
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
        {message && (
          <div className="rounded-2xl border border-info-muted bg-info-muted px-4 py-3 text-sm text-foreground">
            {message}
          </div>
        )}

        <InfoCard title={t(language, "feedback.title")}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <label className="space-y-1">
                <div className="text-xs text-muted-foreground">{t(language, "feedback.category")}</div>
                <select
                  className="h-11 w-full rounded-2xl border bg-background px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FeedbackRow["category"])}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(language, opt.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 sm:col-span-2">
                <div className="text-xs text-muted-foreground">{t(language, "feedback.title_label")}</div>
                <input
                  className="h-11 w-full rounded-2xl border bg-background px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short summary"
                />
              </label>
            </div>

            <label className="space-y-1 text-sm">
              <div className="text-xs text-muted-foreground">{t(language, "feedback.message_label")}</div>
              <textarea
                className="w-full rounded-2xl border bg-background px-4 py-3 text-sm min-h-28"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe the issue or idea…"
              />
            </label>

            <button
              className={buttonPrimary}
              onClick={submit}
              disabled={sending}
            >
              {sending ? t(language, "feedback.sending") : t(language, "feedback.send")}
            </button>
          </div>
        </InfoCard>

        <InfoCard title={t(language, "feedback.your")}>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t(language, "feedback.empty")}</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="rounded-2xl border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase text-muted-foreground">
                      {t(language, `feedback.category_${item.category}`)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("en-GB")}
                    </div>
                  </div>
                  {item.title ? <div className="font-semibold text-foreground">{item.title}</div> : null}
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{item.body}</div>

                  {item.admin_response ? (
                    <div className="rounded-2xl border bg-secondary/40 p-3 text-sm space-y-1">
                      <div className="text-xs text-muted-foreground">{t(language, "feedback.response")}</div>
                      <div className="text-foreground">{item.admin_response}</div>
                      {(item.admin_responded_at &&
                        (!lastSeenAt ||
                          new Date(item.admin_responded_at).getTime() >
                            new Date(lastSeenAt).getTime())) && (
                        <span className={`inline-flex items-center ${badgeNeutral}`}>
                          {t(language, "feedback.new_response")}
                        </span>
                      )}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </InfoCard>
      </div>
      </section>
    </main>
  );
}
