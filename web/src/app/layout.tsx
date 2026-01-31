import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

export const metadata: Metadata = {
  metadataBase: new URL("https://mijnschoolkeuze.com"),
  title: {
    default: "Mijn Schoolkeuze",
    template: "%s — Mijn Schoolkeuze",
  },
  description:
    "Vind en vergelijk middelbare scholen in Amsterdam. Plan open dagen en maak samen een shortlist.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Mijn Schoolkeuze",
    description:
      "Vind en vergelijk middelbare scholen in Amsterdam. Plan open dagen en maak samen een shortlist.",
    url: "/",
    siteName: "Mijn Schoolkeuze",
    locale: "nl_NL",
    type: "website",
    images: [
      {
        url: "/branding/hero/hero-bg.jpg",
        width: 1200,
        height: 630,
        alt: "Mijn Schoolkeuze",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mijn Schoolkeuze",
    description:
      "Vind en vergelijk middelbare scholen in Amsterdam. Plan open dagen en maak samen een shortlist.",
    images: ["/branding/hero/hero-bg.jpg"],
  },
  icons: {
    icon: [
      {
        url: "/branding/mijnschoolkeuze-mobile-icon-standards/pwa/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/branding/mijnschoolkeuze-mobile-icon-standards/pwa/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/branding/mijnschoolkeuze-mobile-icon-standards/ios-web/apple-touch-icon-180x180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const langCookie = store.get("schools_lang")?.value ?? "";
  const language = langCookie === "en" || langCookie === "nl" ? langCookie : "nl";

  return (
    <html lang={language}>
      <body
        className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased font-sans"
      >
        <ClientShell initialLanguage={language}>{children}</ClientShell>
      </body>
    </html>
  );
}
