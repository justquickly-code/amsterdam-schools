import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminUser } from "@/lib/adminAuth";

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatUtcDate(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(req: Request) {
  const admin = await requireAdminUser(req);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    return NextResponse.json(
      { ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL" },
      { status: 500 }
    );
  }

  const client = createClient(url, service, { auth: { persistSession: false } });

  const createdTs: number[] = [];
  let page = 1;
  const perPage = 1000;
  let totalUsers = 0;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const users = data?.users ?? [];
    if (!totalUsers) {
      totalUsers = data?.total ?? 0;
    }

    for (const u of users) {
      const ts = u.created_at ? new Date(u.created_at).getTime() : NaN;
      if (!Number.isNaN(ts)) createdTs.push(ts);
    }

    if (users.length < perPage) {
      if (!totalUsers) totalUsers = createdTs.length;
      break;
    }
    page += 1;
  }

  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const rows = [];

  for (let i = 6; i >= 0; i -= 1) {
    const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const newCount = createdTs.filter((ts) => ts >= dayStart.getTime() && ts < dayEnd.getTime())
      .length;
    const cumulative = createdTs.filter((ts) => ts < dayEnd.getTime()).length;
    rows.push({
      date: formatUtcDate(dayStart),
      new: newCount,
      cumulative,
    });
  }

  return NextResponse.json({
    ok: true,
    total: totalUsers,
    rows,
  });
}
