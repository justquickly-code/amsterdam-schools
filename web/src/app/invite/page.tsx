"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { InfoCard, Wordmark } from "@/components/schoolkeuze";
import { buttonOutline, buttonPrimary } from "@/lib/ui";

export default function InviteStatusPage() {
  const params = useSearchParams();
  const router = useRouter();
  const workspaceId = params.get("workspace_id") ?? "";
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [reason, setReason] = useState("");
  const [existingWorkspaces, setExistingWorkspaces] = useState<Array<{ id: string; name: string }>>([]);
  const [readyToChoose, setReadyToChoose] = useState(false);
  const [joining, setJoining] = useState(false);
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  const acceptInvite = useCallback(async (mode: "switch" | "keep") => {
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
  }, [existingWorkspaces, workspaceId]);

  useEffect(() => {
    (async () => {
      setLanguage(readStoredLanguage());
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
            return { id: ws.id as string, name: (ws.name as string) || t(language, "invite.workspace_fallback") };
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
      const msg = err instanceof Error ? err.message : t(language, "settings.invite_failed");
      setStatus("error");
      setReason(msg);
    });
  }, [workspaceId, acceptInvite, language]);

  const ok = status === "ok";
  const reasonLabel =
    reason === "not_signed_in"
      ? t(language, "invite.reason_not_signed_in")
      : reason === "missing_workspace_id"
      ? t(language, "invite.reason_missing_workspace")
      : reason;

  useEffect(() => {
    function onLang(e: Event) {
      const next = (e as CustomEvent<Language>).detail;
      if (next) setLanguage(next);
    }
    window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <Wordmark />
        <InfoCard
          title={
            status === "idle"
              ? t(language, "invite.title_joining")
              : ok
              ? t(language, "invite.title_joined")
              : t(language, "invite.title_issue")
          }
        >
          {readyToChoose ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{t(language, "invite.already_have")}</p>
              <p>{t(language, "invite.switch_desc")}</p>
              <div className="text-xs">
                {t(language, "invite.current_workspace")}: {existingWorkspaces[0]?.name ?? t(language, "invite.workspace_fallback")}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className={buttonPrimary}
                  type="button"
                  onClick={() => acceptInvite("switch")}
                  disabled={joining}
                >
                  {joining ? t(language, "invite.joining") : t(language, "invite.join_switch")}
                </button>
                <button
                  className={buttonOutline}
                  type="button"
                  onClick={() => acceptInvite("keep")}
                  disabled={joining}
                >
                  {t(language, "invite.keep_current")}
                </button>
              </div>
            </div>
          ) : status === "idle" ? (
            <p className="text-sm text-muted-foreground">{t(language, "invite.finalizing")}</p>
          ) : ok ? (
            <p className="text-sm text-muted-foreground">{t(language, "invite.joined_body")}</p>
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t(language, "invite.error_body")}</p>
              {reason ? <p className="text-xs">{t(language, "invite.error_reason")} {reasonLabel}</p> : null}
              <p>{t(language, "invite.error_help")}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Link className={buttonOutline} href="/">
              {t(language, "invite.go_dashboard")}
            </Link>
            <button
              className={buttonOutline}
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/login");
              }}
            >
              {t(language, "menu.signout")}
            </button>
          </div>
        </InfoCard>
      </div>
    </main>
  );
}
