import { NextResponse } from "next/server";

type Point = { lat: number; lng: number };

export async function POST(req: Request) {
  try {
    const { origin, destination } = (await req.json()) as {
      origin?: Point;
      destination?: Point;
    };

    if (!origin || !destination) {
      return NextResponse.json({ ok: false, error: "Missing origin or destination" }, { status: 400 });
    }

    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
      return NextResponse.json({ ok: false, error: "Missing MAPBOX_ACCESS_TOKEN" }, { status: 500 });
    }

    const url =
      `https://api.mapbox.com/directions/v5/mapbox/cycling/` +
      `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
      `?access_token=${mapboxToken}&geometries=geojson&overview=full`;

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "Directions request failed" }, { status: 500 });
    }

    const json = await res.json();
    const route = json?.routes?.[0];
    if (!route?.geometry?.coordinates) {
      return NextResponse.json({ ok: false, error: "Route not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      coordinates: route.geometry.coordinates,
      duration: route.duration ?? null,
      distance: route.distance ?? null,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
