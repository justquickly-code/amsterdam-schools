import type { Metadata } from "next";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

export const metadata: Metadata = {
  title: "Amsterdam Schools",
  description: "Find and compare schools.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
