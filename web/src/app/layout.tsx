import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

export const metadata: Metadata = {
  title: "Amsterdam Schools",
  description: "Find and compare schools.",
  manifest: "/manifest.webmanifest",
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
