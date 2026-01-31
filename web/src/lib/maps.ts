type DirectionsOptions = {
  origin?: string | null;
  destination: string;
  travelMode?: "bicycling" | "walking" | "driving" | "transit";
};

export function googleMapsDirectionsUrl({ origin, destination, travelMode = "bicycling" }: DirectionsOptions) {
  const params = new URLSearchParams({ api: "1", destination, travelmode: travelMode });
  if (origin) params.set("origin", origin);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
