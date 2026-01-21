"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { InfoCard } from "@/components/schoolkeuze";

export default function InviteStatusPage() {
  const params = useSearchParams();
  const router = useRouter();
  const workspaceId = params.get("workspace_id") ?? "";
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [reason, setReason] = useState("");
  const [existingWorkspaces, setExistingWorkspaces] = useState<Array<{ id: string; name: string }>>([]);
  const [readyToChoose, setReadyToChoose] = useState(false);
  const [joining, setJoining] = useState(false);

  async function acceptInvite(mode: "switch" | "keep") {
    if (!workspaceId) return;
    setJoining(true);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token ?? "";
    if (!token) {
      setStatus("error");
      setReason("not_signed_in");
      setJoining(false);
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
      setJoining(false);
      return;
    }

    if (typeof window !== "undefined") {
      if (mode === "switch") {
        window.localStorage.setItem("active_workspace_id", workspaceId);
      } else {
        const current = window.localStorage.getItem("active_workspace_id");
        const fallback = existingWorkspaces[0]?.id ?? "";
        window.localStorage.setItem("active_workspace_id", current || fallback);
      }
    }

    setStatus("ok");
    setJoining(false);
  }

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

      const userId = session.session?.user.id ?? "";
      if (!userId) {
        setStatus("error");
        setReason("not_signed_in");
        return;
      }

      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace:workspaces(id,name)")
        .eq("user_id", userId);

      const list =
        (memberships ?? [])
          .map((row) => {
            const ws = Array.isArray(row.workspace) ? row.workspace[0] : row.workspace;
            if (!ws) return null;
            return { id: ws.id as string, name: (ws.name as string) || "Workspace" };
          })
          .filter(Boolean) as Array<{ id: string; name: string }>;

      if (list.length === 0) {
        await acceptInvite("switch");
        return;
      }

      if (list.length === 1 && list[0]?.id === workspaceId) {
        setStatus("ok");
        return;
      }

      setExistingWorkspaces(list);
      setReadyToChoose(true);
    })().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : "Invite failed";
      setStatus("error");
      setReason(msg);
    });
  }, [workspaceId]);

  const ok = status === "ok";

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <InfoCard
          title={status === "idle" ? "Joining workspace..." : ok ? "Workspace joined" : "Invite issue"}
        >
          {readyToChoose ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>You already have a workspace.</p>
              <p>
                Joining this family workspace will switch your active workspace. Your existing workspace stays intact.
              </p>
              <div className="text-xs">
                Current workspace: {existingWorkspaces[0]?.name ?? "Workspace"}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
                  type="button"
                  onClick={() => acceptInvite("switch")}
                  disabled={joining}
                >
                  {joining ? "Joining..." : "Join and switch"}
                </button>
                <button
                  className="rounded-full border px-4 py-2 text-xs font-semibold"
                  type="button"
                  onClick={() => acceptInvite("keep")}
                  disabled={joining}
                >
                  Keep my current workspace
                </button>
              </div>
            </div>
          ) : status === "idle" ? (
            <p className="text-sm text-muted-foreground">Finalizing your invite…</p>
          ) : ok ? (
            <p className="text-sm text-muted-foreground">
              You’re now part of the shared workspace. You can go to the dashboard.
            </p>
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                We couldn’t finish joining the workspace from the invite link.
              </p>
              {reason ? <p className="text-xs">Reason: {reason}</p> : null}
              <p>
                Ask the workspace owner to resend the invite after they restart the app.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Link className="rounded-full border px-4 py-2 text-xs font-semibold" href="/">
              Go to Dashboard
            </Link>
            <button
              className="rounded-full border px-4 py-2 text-xs font-semibold"
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/login");
              }}
            >
              Sign out
            </button>
          </div>
        </InfoCard>
      </div>
    </main>
  );
}
