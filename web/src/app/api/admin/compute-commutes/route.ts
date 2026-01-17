import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type GeocodeFeature = {
  center: [number, number]; // [lng, lat]
};

type DirectionsRoute = {
  duration: number;
  distance: number;
};

type DirectionsResponse = {
  routes?: DirectionsRoute[];
};

export async function POST(req: Request) {
  const adminToken = req.headers.get("x-admin-token") ?? "";
  if (!process.env.ADMIN_SYNC_TOKEN || adminToken !== process.env.ADMIN_SYNC_TOKEN) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Missing Authorization" }, { status: 401 });
  }
  const jwt = authHeader.slice("Bearer ".length).trim();
  if (!jwt) {
    return NextResponse.json({ ok: false, error: "Missing Authorization" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN!;

  if (!serviceKey) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }
  if (!mapboxToken) {
    return NextResponse.json({ ok: false, error: "Missing MAPBOX_ACCESS_TOKEN" }, { status: 500 });
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Service role bypasses RLS so we must never pick a workspace via limit(1).
  const { data: workspace, error: wErr } = await userClient
    .from("workspaces")
    .select("id,home_postcode,home_house_number,home_lat,home_lng")
    .limit(1)
    .maybeSingle();

  if (wErr) return NextResponse.json({ ok: false, error: wErr.message }, { status: 500 });
  if (!workspace) return NextResponse.json({ ok: false, error: "No workspace found" }, { status: 400 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const postcode = (workspace.home_postcode ?? "").trim();
  const houseNumber = (workspace.home_house_number ?? "").trim();

  if (!postcode || !houseNumber) {
    return NextResponse.json(
      { ok: false, error: "Workspace home_postcode + home_house_number must be set in Settings" },
      { status: 400 }
    );
  }

  // 1) Geocode home if needed
  let homeLat = workspace.home_lat as number | null;
  let homeLng = workspace.home_lng as number | null;

  if (!homeLat || !homeLng) {
    const query = encodeURIComponent(`${postcode} ${houseNumber}, Amsterdam, Netherlands`);
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?limit=1&access_token=${mapboxToken}`;

    const geoRes = await fetch(geocodeUrl);
    if (!geoRes.ok) {
      return NextResponse.json({ ok: false, error: `Geocode failed: ${geoRes.status}` }, { status: 500 });
    }

    const geoJson = (await geoRes.json()) as { features?: GeocodeFeature[] };
    const feature = geoJson.features?.[0];
    if (!feature?.center) {
      return NextResponse.json({ ok: false, error: "Geocode returned no results" }, { status: 500 });
    }

    homeLng = feature.center[0];
    homeLat = feature.center[1];

    await admin
      .from("workspaces")
      .update({ home_lat: homeLat, home_lng: homeLng })
      .eq("id", workspace.id);
  }

  // 2) Fetch schools with coordinates
  const { data: schools, error: sErr } = await admin
    .from("schools")
    .select("id,lat,lng")
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });
  const schoolRows = (schools ?? []) as Array<{ id: string; lat: number; lng: number }>;

  if (schoolRows.length === 0) {
    return NextResponse.json({ ok: false, error: "No schools with coordinates found" }, { status: 400 });
  }

  // Limit per run to avoid rate limits. You can re-run to fill the rest.
  const { limit = 200 } = (await req.json().catch(() => ({}))) as { limit?: number };
  const batch = schoolRows.slice(0, Math.max(1, Math.min(200, limit)));

  let computed = 0;

  for (const s of batch) {
    // Mapbox Directions: cycling
    const directionsUrl =
      `https://api.mapbox.com/directions/v5/mapbox/cycling/` +
      `${homeLng},${homeLat};${s.lng},${s.lat}` +
      `?access_token=${mapboxToken}&geometries=geojson&overview=false`;

    const dRes = await fetch(directionsUrl);
    if (!dRes.ok) continue;

    const dJson = (await dRes.json()) as DirectionsResponse;
    const route = dJson.routes?.[0];
    if (!route) continue;

    const durationMinutes = Math.round(route.duration / 60);
    const distanceKm = Math.round((route.distance / 1000) * 100) / 100; // 2dp

    const { error: upErr } = await admin.from("commute_cache").upsert(
      {
        workspace_id: workspace.id,
        school_id: s.id,
        mode: "bike",
        duration_minutes: durationMinutes,
        distance_km: distanceKm,
        provider: "mapbox",
        computed_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,school_id,mode" }
    );

    if (!upErr) computed += 1;
  }

  return NextResponse.json({
    ok: true,
    workspace_id: workspace.id,
    home: { lat: homeLat, lng: homeLng },
    schools_considered: batch.length,
    computed,
    note: "Re-run to compute more schools (batch limited).",
  });
}