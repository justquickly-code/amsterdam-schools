import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// DEV ONLY: writes to the DB using the anon key.
// This is fine for local dev with RLS allowing reads only; inserts will fail unless we relax RLS or run via service role.
// For now, this endpoint just demonstrates wiring and returns a helpful message.
export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Example schools (levels chosen to test filtering)
  const rows = [
    {
      source: "dev",
      source_id: "dev-1",
      name: "Example School HAVO/VWO",
      address: "Amsterdam",
      supported_levels: ["havo", "vwo"],
      website_url: "https://example.com",
      last_synced_at: new Date().toISOString(),
    },
    {
      source: "dev",
      source_id: "dev-2",
      name: "Example School VMBO-TL",
      address: "Amsterdam",
      supported_levels: ["vmbo-tl"],
      website_url: "https://example.com",
      last_synced_at: new Date().toISOString(),
    },
  ];

  const { error } = await supabase.from("schools").upsert(rows, {
    onConflict: "source,source_id",
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Insert blocked (expected for now). We'll seed via SQL in the next step.",
        error: error.message,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, inserted: rows.length });
}