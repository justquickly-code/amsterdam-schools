"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { InfoCard, Wordmark } from "@/components/schoolkeuze";
import { buttonPrimary } from "@/lib/ui";

type FeedbackRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  category: string;
  title: string | null;
  body: string;
  status: "open" | "in_review" | "resolved";
  admin_response: string | null;
  admin_responded_at: string | null;
  created_at: string;
};

export default function AdminFeedbackPage() {
  const [forbidden, setForbidden] = useState(false);
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [selected, setSelected] = useState<FeedbackRow | null>(null);
  const [status, setStatus] = useState<FeedbackRow["status"]>("open");
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [lastSeenMs, setLastSeenMs] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token ?? "";
      if (!accessToken) {
        setForbidden(true);
        return;
      }

      const res = await fetch("/api/admin/check", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        setForbidden(true);
        return;
      }

      const storedLastSeen =
        typeof window !== "undefined"
          ? new Date(window.localStorage.getItem("admin_feedback_last_seen") ?? 0).getTime()
          : 0;
      setLastSeenMs(Number.isFinite(storedLastSeen) ? storedLastSeen : 0);

      const listRes = await fetch("/api/admin/feedback", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!listRes.ok) {
        setForbidden(true);
        return;
      }
      const json = await listRes.json().catch(() => null);
      const list = (json?.items ?? []) as FeedbackRow[];
      setItems(list);
      if (typeof window !== "undefined") {
        const latest = list[0]?.created_at ?? new Date().toISOString();
        window.localStorage.setItem("admin_feedback_last_seen", latest);
        window.dispatchEvent(new Event("admin-feedback-seen"));
      }
    })().catch(() => setForbidden(true));
  }, []);

  async function save() {
    if (!selected) return;
    setSaving(true);
    setMessage("");

    const { data: sess } = await supabase.auth.getSession();
    const accessToken = sess.session?.access_token ?? "";
    if (!accessToken) {
      setForbidden(true);
      setSaving(false);
      return;
    }

    const res = await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        id: selected.id,
        status,
        admin_response: response,
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage(json?.error ?? "Save failed.");
      setSaving(false);
      return;
    }

    const updated = (json?.item ?? null) as FeedbackRow | null;
    if (updated) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                status: updated.status,
                admin_response: updated.admin_response,
                admin_responded_at: updated.admin_responded_at,
              }
            : item
        )
      );
    }
    setMessage("Saved.");
    setSaving(false);
  }

  if (forbidden) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center">
          <p className="text-sm text-red-600">Forbidden: admin access required.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col gap-2">
          <Wordmark />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-serif font-semibold text-foreground">Feedback</h1>
            <Link className="text-sm font-semibold text-primary hover:underline" href="/admin">
              Admin home
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
          <InfoCard title="Inbox">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback yet.</p>
            ) : (
              <ul className="divide-y rounded-2xl border bg-card">
                {items.map((item) => {
                  const itemIsNew =
                    lastSeenMs > 0 ? new Date(item.created_at).getTime() > lastSeenMs : true;
                  return (
                    <li
                      key={item.id}
                      className={`p-4 cursor-pointer ${selected?.id === item.id ? "bg-secondary/40" : ""}`}
                      onClick={() => {
                        setSelected(item);
                        setStatus(item.status);
                        setResponse(item.admin_response ?? "");
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-xs uppercase text-muted-foreground">{item.category}</div>
                          {itemIsNew && <span className="h-2 w-2 rounded-full bg-red-500" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{item.status}</div>
                      </div>
                      <div className="font-semibold text-foreground">{item.title ?? "Feedback"}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2">{item.body}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </InfoCard>

          <InfoCard title="Response">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select feedback to respond.</p>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">{selected.category}</div>
                  <div className="font-semibold text-foreground">{selected.title ?? "Feedback"}</div>
                  <div className="text-sm whitespace-pre-wrap text-muted-foreground">{selected.body}</div>
                </div>

                <label className="space-y-1">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <select
                    className="w-full rounded-2xl border bg-background px-4 py-2 text-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as FeedbackRow["status"])}
                  >
                    <option value="open">open</option>
                    <option value="in_review">in_review</option>
                    <option value="resolved">resolved</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <div className="text-sm text-muted-foreground">Response</div>
                  <textarea
                    className="w-full rounded-2xl border bg-background px-4 py-3 text-sm min-h-28"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Write a response..."
                  />
                </label>

                <button
                  className={buttonPrimary}
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save response"}
                </button>
                {message && <div className="text-xs text-muted-foreground">{message}</div>}
              </div>
            )}
          </InfoCard>
        </div>
      </div>
    </main>
  );
}
