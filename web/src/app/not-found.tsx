"use client";

import Link from "next/link";
import { InfoCard } from "@/components/schoolkeuze";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <InfoCard title="Page not found">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Sorry, we can’t find that page.</p>
            <Link className="rounded-full border px-4 py-2 text-xs font-semibold text-foreground" href="/">
              Back to Dashboard
            </Link>
          </div>
        </InfoCard>
      </div>
    </main>
  );
}
