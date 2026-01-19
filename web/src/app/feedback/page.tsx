"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchCurrentWorkspace } from "@/lib/workspace";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";

type WorkspaceRow = { id: string; language?: Language | null };

type FeedbackRow = {
  id: string;
  category: "bug" | "idea" | "question" | "other";
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
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-3xl rounded-xl border p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t(language, "feedback.title")}</h1>
          <p className="text-sm text-muted-foreground">{t(language, "feedback.subtitle")}</p>
        </div>

        {error && <p className="text-sm text-red-600">Error: {error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}

        <div className="rounded-lg border p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1">
              <div className="text-sm text-muted-foreground">{t(language, "feedback.category")}</div>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
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
              <div className="text-sm text-muted-foreground">{t(language, "feedback.title_label")}</div>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short summary"
              />
            </label>
          </div>

          <label className="space-y-1">
            <div className="text-sm text-muted-foreground">{t(language, "feedback.message_label")}</div>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm min-h-28"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe the issue or idea…"
            />
          </label>

          <button className="rounded-md border px-3 py-2 text-sm" onClick={submit} disabled={sending}>
            {sending ? t(language, "feedback.sending") : t(language, "feedback.send")}
          </button>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold">{t(language, "feedback.your")}</h2>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t(language, "feedback.empty")}</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase text-muted-foreground">
                      {t(language, `feedback.category_${item.category}`)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("en-GB")}
                    </div>
                  </div>
                  {item.title ? <div className="font-medium">{item.title}</div> : null}
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{item.body}</div>

                  {item.admin_response ? (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                      <div className="text-xs text-muted-foreground">{t(language, "feedback.response")}</div>
                      <div>{item.admin_response}</div>
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                        {t(language, "feedback.new_response")}
                      </span>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
