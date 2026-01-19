import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminUser } from "@/lib/adminAuth";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  const admin = await requireAdminUser(req);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing service role" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("feedback")
    .select(
      "id,workspace_id,user_id,category,title,body,status,admin_response,admin_responded_at,created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function PATCH(req: Request) {
  const admin = await requireAdminUser(req);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing service role" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body?.status === "string") updates.status = body.status;
  if (typeof body?.admin_response === "string") {
    updates.admin_response = body.admin_response;
    updates.admin_responded_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("feedback")
    .update(updates)
    .eq("id", id)
    .select("id,status,admin_response,admin_responded_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
