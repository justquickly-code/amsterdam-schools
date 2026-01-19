import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mijn Schoolkeuze",
    short_name: "Schoolkeuze",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/file.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
