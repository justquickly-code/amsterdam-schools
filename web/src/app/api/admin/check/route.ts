import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/adminAuth";

export async function GET(req: Request) {
  const auth = await requireAdminUser(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false });
  }
  return NextResponse.json({ ok: true });
}
