import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

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
      <body className={`${nunito.className} min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased`}>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
