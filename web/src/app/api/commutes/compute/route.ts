export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type GeocodeFeature = {
  center: [number, number];
};

type DirectionsRoute = {
  duration: number;
  distance: number;
};

type DirectionsResponse = {
  routes?: DirectionsRoute[];
};

type ComputeBody = {
  workspace_id?: string;
  school_ids?: string[];
  limit?: number;
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

  const body = (await req.json().catch(() => ({}))) as ComputeBody;
  const workspaceId = (body.workspace_id ?? "").trim();
  const schoolIds = (body.school_ids ?? []).filter(Boolean);

  if (!workspaceId) {
    return NextResponse.json({ ok: false, error: "Missing workspace_id" }, { status: 400 });
  }
  if (schoolIds.length === 0) {
    return NextResponse.json({ ok: false, error: "No school_ids provided" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

  if (!supabaseUrl || !anonKey || !mapboxToken) {
    return NextResponse.json({ ok: false, error: "Missing env vars" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: workspace, error: wErr } = await supabase
    .from("workspaces")
    .select("id,home_postcode,home_house_number,home_lat,home_lng")
    .eq("id", workspaceId)
    .maybeSingle();

  if (wErr) return NextResponse.json({ ok: false, error: wErr.message }, { status: 500 });
  if (!workspace) return NextResponse.json({ ok: false, error: "No workspace found" }, { status: 400 });

  const postcode = (workspace.home_postcode ?? "").trim();
  const houseNumber = (workspace.home_house_number ?? "").trim();
  if (!postcode || !houseNumber) {
    return NextResponse.json(
      { ok: false, error: "Workspace home_postcode + home_house_number must be set in Settings" },
      { status: 400 }
    );
  }

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

    const { error: upErr } = await supabase
      .from("workspaces")
      .update({ home_lat: homeLat, home_lng: homeLng })
      .eq("id", workspace.id);

    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  const { data: schools, error: sErr } = await supabase
    .from("schools")
    .select("id,lat,lng")
    .in("id", schoolIds)
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });
  const schoolRows = (schools ?? []) as Array<{ id: string; lat: number; lng: number }>;

  if (schoolRows.length === 0) {
    return NextResponse.json({ ok: false, error: "No schools with coordinates found" }, { status: 400 });
  }

  const { data: existing, error: eErr } = await supabase
    .from("commute_cache")
    .select("school_id")
    .eq("workspace_id", workspace.id)
    .eq("mode", "bike")
    .in(
      "school_id",
      schoolRows.map((s) => s.id)
    );

  if (eErr) return NextResponse.json({ ok: false, error: eErr.message }, { status: 500 });

  const existingSet = new Set((existing ?? []).map((r) => r.school_id));
  const missing = schoolRows.filter((s) => !existingSet.has(s.id));

  const max = Math.max(1, Math.min(20, Number(body.limit ?? 10)));
  const batch = missing.slice(0, max);

  let computed = 0;

  for (const s of batch) {
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
    const distanceKm = Math.round((route.distance / 1000) * 100) / 100;

    const { error: upErr } = await supabase.from("commute_cache").upsert(
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
    attempted: batch.length,
    computed,
  });
}
