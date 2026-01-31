"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { cn } from "@/lib/utils";
import { HomePin, SchoolPin, SchoolPinSelected } from "@/components/schoolkeuze/map-pins";
import { createRoot, type Root } from "react-dom/client";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  href?: string;
  pin: "school" | "selected" | "home";
};

export type MapRoute = {
  coordinates: Array<[number, number]>;
};

type MapboxMapProps = {
  className?: string;
  markers: MapMarker[];
  route?: MapRoute | null;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  viewLabel?: string;
};

function buildPopup(marker: MapMarker, viewLabel: string) {
  const wrap = document.createElement("div");
  wrap.className = "space-y-1";

  const title = document.createElement("div");
  title.textContent = marker.title;
  title.className = "text-sm font-semibold";
  wrap.appendChild(title);

  if (marker.href) {
    const link = document.createElement("a");
    link.href = marker.href;
    link.textContent = viewLabel;
    link.className = "text-xs text-blue-600 underline";
    wrap.appendChild(link);
  }

  return wrap;
}

function createMarkerElement(pin: MapMarker["pin"], size: number, label?: string) {
  const el = document.createElement("div");
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.background = "transparent";
  el.style.boxShadow = "none";
  el.style.border = "0";
  el.style.padding = "0";

  const root = createRoot(el);
  const node =
    pin === "home" ? (
      <HomePin size={36} label={label} />
    ) : pin === "selected" ? (
      <SchoolPinSelected size={48} label={label} />
    ) : (
      <SchoolPin size={40} label={label} />
    );
  root.render(node);
  return { el, root };
}

export default function MapboxMap({ className, markers, route, selectedId, onSelect, viewLabel = "View school" }: MapboxMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const markerRootsRef = useRef<Root[]>([]);
  const lastFitKey = useRef<string>("");

  const token = useMemo(() => process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN, []);


  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !token) return;
    mapboxgl.accessToken = token;

    mapInstance.current = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [4.9041, 52.3676],
      zoom: 11,
    });

    mapInstance.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
  }, [token]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    markerRootsRef.current.forEach((root) => root.unmount());
    markerRootsRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();

    markers.forEach((marker) => {
      const pin = marker.id === selectedId ? "selected" : marker.pin;
      const size = marker.id === selectedId ? 36 : 32;
      const label = marker.pin === "home" ? marker.title : undefined;
      const { el, root } = createMarkerElement(pin, size, label);
      const popup = buildPopup(marker, viewLabel);
      const mbMarker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([marker.lng, marker.lat])
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setDOMContent(popup))
        .addTo(map);

      el.addEventListener("click", () => {
        onSelect?.(marker.id);
      });

      markersRef.current.push(mbMarker);
      markerRootsRef.current.push(root);
      bounds.extend([marker.lng, marker.lat]);
    });

    const fitKey = markers.map((m) => `${m.id}:${m.lat.toFixed(5)},${m.lng.toFixed(5)}`).join("|");
    if (!bounds.isEmpty() && fitKey !== lastFitKey.current) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 0 });
      lastFitKey.current = fitKey;
    }
  }, [markers, selectedId, onSelect, viewLabel]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (!map.isStyleLoaded()) {
      const onLoad = () => {
        map.off("load", onLoad);
        if (route?.coordinates?.length) {
          map.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: { type: "LineString", coordinates: route.coordinates },
              properties: {},
            },
          });
          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            paint: {
              "line-color": "#E15B4F",
              "line-width": 4,
            },
          });
        }
      };
      map.on("load", onLoad);
      return;
    }

    const source = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
    if (route?.coordinates?.length) {
      const data = {
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: route.coordinates },
        properties: {},
      };
      if (source) {
        source.setData(data);
      } else {
        map.addSource("route", { type: "geojson", data });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          paint: { "line-color": "#E15B4F", "line-width": 4 },
        });
      }
    } else if (source) {
      source.setData({ type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} });
    }
  }, [route]);

  if (!token) {
    return (
      <div className={cn("rounded-3xl border bg-muted/30 p-4 text-sm text-muted-foreground", className)}>
        Map unavailable: missing MAPBOX token.
      </div>
    );
  }

  return <div ref={mapRef} className={cn("h-72 w-full overflow-hidden rounded-3xl border", className)} />;
}
