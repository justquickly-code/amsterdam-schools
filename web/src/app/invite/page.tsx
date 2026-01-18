"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function InviteStatusPage() {
  const params = useSearchParams();
  const router = useRouter();
  const workspaceId = params.get("workspace_id") ?? "";
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [reason, setReason] = useState("");

  useEffect(() => {
    (async () => {
      if (!workspaceId) {
        setStatus("error");
        setReason("missing_workspace_id");
        return;
      }
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      if (!token) {
        setStatus("error");
        setReason("not_signed_in");
        return;
      }

      const res = await fetch("/api/workspaces/accept-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus("error");
        setReason(json?.error ?? "Invite failed");
        return;
      }
      setStatus("ok");
    })().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : "Invite failed";
      setStatus("error");
      setReason(msg);
    });
  }, [workspaceId]);

  const ok = status === "ok";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-6 space-y-4 text-sm">
        <h1 className="text-2xl font-semibold">
          {status === "idle" ? "Joining workspace..." : ok ? "Workspace joined" : "Invite issue"}
        </h1>
        {status === "idle" ? (
          <p className="text-muted-foreground">Finalizing your invite…</p>
        ) : ok ? (
          <p className="text-muted-foreground">
            You’re now part of the shared workspace. You can go to the dashboard.
          </p>
        ) : (
          <div className="space-y-2 text-muted-foreground">
            <p>
              We couldn’t finish joining the workspace from the invite link.
            </p>
            {reason ? <p className="text-xs">Reason: {reason}</p> : null}
            <p>
              Ask the workspace owner to resend the invite after they restart the app.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link className="inline-block rounded-md border px-3 py-2" href="/">
            Go to Dashboard
          </Link>
          <button
            className="rounded-md border px-3 py-2 text-sm"
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
