import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type InvitePayload = {
  workspace_id?: string;
  email?: string;
  role?: "owner" | "editor" | "viewer";
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "Missing Authorization" }, { status: 401 });
    }
    const jwt = authHeader.slice("Bearer ".length).trim();
    if (!jwt) {
      return NextResponse.json({ ok: false, error: "Missing Authorization" }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anon || !service) {
      return NextResponse.json(
        { ok: false, error: "Missing env vars (SUPABASE_SERVICE_ROLE_KEY required)" },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as InvitePayload;
    const workspaceId = (body.workspace_id ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const role = (body.role ?? "editor") as "owner" | "editor" | "viewer";

    if (!workspaceId || !email) {
      return NextResponse.json({ ok: false, error: "Workspace and email are required" }, { status: 400 });
    }

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: workspace, error: wErr } = await userClient
      .from("workspaces")
      .select("id,created_by,child_name")
      .eq("id", workspaceId)
      .maybeSingle();

    if (wErr || !workspace) {
      return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 404 });
    }

    if (workspace.created_by !== userData.user.id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const origin = new URL(req.url).origin;
  const redirectBase = origin.includes("127.0.0.1") ? origin.replace("127.0.0.1", "localhost") : origin;
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${redirectBase}/invite?workspace_id=${workspaceId}`,
    data: {
      child_name: workspace.child_name ?? "",
      inviter_email: userData.user.email ?? "",
    },
  });

  if (inviteErr) {
    return NextResponse.json({ ok: false, error: inviteErr.message }, { status: 400 });
  }

  const { error: insErr } = await admin.from("workspace_invites").insert({
    workspace_id: workspaceId,
    email,
    role,
    invited_by: userData.user.id,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({ ok: true, already_invited: true });
    }
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invite failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
