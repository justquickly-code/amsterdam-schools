import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AcceptPayload = {
  workspace_id?: string;
};

export async function POST(req: Request) {
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

  const body = (await req.json().catch(() => ({}))) as AcceptPayload;
  const workspaceId = (body.workspace_id ?? "").trim();
  if (!workspaceId) {
    return NextResponse.json({ ok: false, error: "Missing workspace_id" }, { status: 400 });
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const email = (userData.user.email ?? "").toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing user email" }, { status: 400 });
  }

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: inviteRow, error: inviteErr } = await admin
    .from("workspace_invites")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .maybeSingle();

  if (inviteErr) {
    return NextResponse.json({ ok: false, error: inviteErr.message }, { status: 400 });
  }
  if (!inviteRow) {
    return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });
  }

  const role = (inviteRow?.role as "owner" | "editor" | "viewer") ?? "editor";

  const { error: addErr } = await admin.from("workspace_members").upsert({
    workspace_id: workspaceId,
    user_id: userData.user.id,
    role,
    member_email: email,
  });

  if (addErr) {
    return NextResponse.json({ ok: false, error: addErr.message }, { status: 400 });
  }

  const { error: updErr } = await admin
    .from("workspace_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("email", email);

  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
