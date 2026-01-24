import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const isLocalHost =
    requestUrl.hostname === "127.0.0.1" || requestUrl.hostname === "0.0.0.0";
  const redirectOrigin = isLocalHost
    ? `http://localhost:${requestUrl.port || "3000"}`
    : requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const token = requestUrl.searchParams.get("token");
  const type = requestUrl.searchParams.get("type");
  const invite = requestUrl.searchParams.get("invite");
  const workspaceId = requestUrl.searchParams.get("workspace_id");
  const lang = requestUrl.searchParams.get("lang");
  const setup = requestUrl.searchParams.get("setup");

  // Local client is fine here; for production you may prefer server-side auth helpers later.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  if (code || token) {
    const { data, error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token_hash: token ?? "",
          type: (type ?? "magiclink") as "magiclink" | "invite" | "recovery" | "signup",
        });
    const session = data?.session ?? null;
    let inviteStatus: "ok" | "error" = "ok";
    let inviteReason = "";

    const inviteFlag = Boolean(invite || type === "invite");

    if (!error && inviteFlag && session?.user) {
      const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!service) {
        inviteStatus = "error";
        inviteReason = "missing_service_key";
      } else {
        const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, service, {
          auth: { persistSession: false },
        });

        let targetWorkspaceId = workspaceId;

        if (!targetWorkspaceId) {
          const { data: inviteRow } = await admin
            .from("workspace_invites")
            .select("workspace_id,created_at")
            .eq("email", (session.user.email ?? "").toLowerCase())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          targetWorkspaceId = inviteRow?.workspace_id ?? null;
        }

        if (!targetWorkspaceId) {
          inviteStatus = "error";
          inviteReason = "missing_workspace_id";
        } else {
          const { data: inviteRow } = await admin
          .from("workspace_invites")
          .select("role")
          .eq("workspace_id", targetWorkspaceId)
          .eq("email", (session.user.email ?? "").toLowerCase())
          .maybeSingle();

          const role = (inviteRow?.role as "owner" | "editor" | "viewer") ?? "editor";

          const { error: addErr } = await admin.from("workspace_members").upsert({
            workspace_id: targetWorkspaceId,
            user_id: session.user.id,
            role,
            member_email: session.user.email ?? null,
          });

          if (addErr) {
            inviteStatus = "error";
            inviteReason = addErr.message;
          } else {
            const { error: updErr } = await admin
              .from("workspace_invites")
              .update({ accepted_at: new Date().toISOString() })
              .eq("workspace_id", targetWorkspaceId)
              .eq("email", (session.user.email ?? "").toLowerCase());
            if (updErr) {
              inviteStatus = "error";
              inviteReason = updErr.message;
            }
          }
        }
      }

      if (inviteStatus === "error") {
        const errorUrl = new URL("/invite", redirectOrigin);
        errorUrl.searchParams.set("status", "error");
        if (inviteReason) errorUrl.searchParams.set("reason", inviteReason);
        if (lang === "en" || lang === "nl") errorUrl.searchParams.set("lang", lang);
        return NextResponse.redirect(errorUrl);
      }

      const okUrl = new URL("/invite", redirectOrigin);
      okUrl.searchParams.set("status", "ok");
      if (lang === "en" || lang === "nl") okUrl.searchParams.set("lang", lang);
      return NextResponse.redirect(okUrl);
    }
  }

  // After successful exchange, redirect home (or setup if requested).
  const homeUrl = new URL(setup ? "/setup" : "/profile", redirectOrigin);
  if (lang === "en" || lang === "nl") homeUrl.searchParams.set("lang", lang);
  return NextResponse.redirect(homeUrl);
}
