import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased font-sans"
      >
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
