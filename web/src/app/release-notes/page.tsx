"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { InfoCard } from "@/components/schoolkeuze";
import { t, useLanguageStore } from "@/lib/i18n";

export default function ReleaseNotesPage() {
  const language = useLanguageStore();
  const mainFeatures = useMemo(
    () => [
      t(language, "release.features.explore"),
      t(language, "release.features.auth"),
      t(language, "release.features.shortlist"),
      t(language, "release.features.commute"),
      t(language, "release.features.open_days"),
      t(language, "release.features.school_detail"),
      t(language, "release.features.profile"),
      t(language, "release.features.setup"),
      t(language, "release.features.print"),
    ],
    [language]
  );

  const releases = useMemo(
    () => [
      {
        title: t(language, "release.section_unreleased"),
        items: [
          t(language, "release.unreleased.language_issue"),
          t(language, "release.unreleased.explore_list"),
          t(language, "release.unreleased.advies_and"),
          t(language, "release.unreleased.shortlist_controls"),
          t(language, "release.unreleased.journey_line"),
        ],
      },
      {
        title: t(language, "release.section_2026_01_25"),
        items: [
          t(language, "release.v1.explore"),
          t(language, "release.v1.auth"),
          t(language, "release.v1.shortlist"),
          t(language, "release.v1.commute"),
          t(language, "release.v1.open_days"),
          t(language, "release.v1.school_detail"),
          t(language, "release.v1.profile"),
          t(language, "release.v1.setup"),
          t(language, "release.v1.print"),
        ],
      },
    ],
    [language]
  );

  return (
    <main className="min-h-screen pb-24">
      <header className="relative -mt-4 overflow-hidden min-h-[260px] md:min-h-[320px]">
        <div className="absolute inset-0">
          <Image src="/branding/hero/hero-bg.jpg" alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
        </div>
        <div className="relative px-4 pt-10 pb-12 sm:px-6">
          <div className="mx-auto w-full max-w-4xl">
            <h1 className="text-3xl font-serif font-semibold text-white drop-shadow-sm">
              {t(language, "release.title")}
            </h1>
            <p className="mt-2 text-sm text-white/90">{t(language, "release.subtitle")}</p>
          </div>
        </div>
      </header>

      <section className="bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-6">

        <InfoCard title={t(language, "release.main_features_title")}>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {mainFeatures.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </InfoCard>

        {releases.map((release) => (
          <InfoCard key={release.title} title={release.title}>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {release.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </InfoCard>
        ))}

        <div className="text-xs text-muted-foreground">
          {t(language, "release.footer")}
          <span className="ml-2">
            <Link className="underline" href="/profile">
              {t(language, "release.footer_link")}
            </Link>
          </span>
        </div>
        </div>
      </section>
    </main>
  );
}
