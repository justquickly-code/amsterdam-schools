"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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

      const listRes = await fetch("/api/admin/feedback", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!listRes.ok) {
        setForbidden(true);
        return;
      }
      const json = await listRes.json().catch(() => null);
      setItems((json?.items ?? []) as FeedbackRow[]);
    })().catch(() => setForbidden(true));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setStatus(selected.status);
    setResponse(selected.admin_response ?? "");
  }, [selected]);

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
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-red-600">Forbidden: admin access required.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-5xl rounded-xl border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Feedback</h1>
          <Link className="text-sm underline" href="/admin">
            Admin home
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
          <div className="space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={`p-3 cursor-pointer ${selected?.id === item.id ? "bg-muted/30" : ""}`}
                    onClick={() => setSelected(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase text-muted-foreground">{item.category}</div>
                      <div className="text-xs text-muted-foreground">{item.status}</div>
                    </div>
                    <div className="font-medium">{item.title ?? "Feedback"}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2">{item.body}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select feedback to respond.</p>
            ) : (
              <>
                <div className="text-xs text-muted-foreground">{selected.category}</div>
                <div className="font-medium">{selected.title ?? "Feedback"}</div>
                <div className="text-sm whitespace-pre-wrap text-muted-foreground">{selected.body}</div>

                <label className="space-y-1">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
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
                    className="w-full rounded-md border px-3 py-2 text-sm min-h-28"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Write a response..."
                  />
                </label>

                <button className="rounded-md border px-3 py-2 text-sm" onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save response"}
                </button>
                {message && <div className="text-xs text-muted-foreground">{message}</div>}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
