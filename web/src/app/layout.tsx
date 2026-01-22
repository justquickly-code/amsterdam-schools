import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["600", "700"],
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
      <body
        className={`${dmSans.variable} ${fraunces.variable} min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased font-sans`}
      >
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
