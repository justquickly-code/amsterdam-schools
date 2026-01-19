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
        src: "/branding/mijnschoolkeuze-mobile-icon-standards/pwa/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/branding/mijnschoolkeuze-mobile-icon-standards/pwa/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/branding/mijnschoolkeuze-mobile-icon-standards/pwa/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/branding/mijnschoolkeuze-mobile-icon-standards/pwa/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
