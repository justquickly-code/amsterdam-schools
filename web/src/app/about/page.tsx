"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { InfoCard } from "@/components/schoolkeuze";

export default function AboutPage() {
  const [language, setLanguage] = useState<Language>(() => readStoredLanguage());

  useEffect(() => {
    const onLang = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next) setLanguage(next);
    };
    window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
  }, []);

  return (
    <main className="min-h-screen pb-24">
      <header className="relative -mt-4 overflow-hidden min-h-[260px] md:min-h-[320px]">
        <div className="absolute inset-0">
          <Image src="/branding/hero/hero-bg.jpg" alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
        </div>
        <div className="relative px-5 pt-10 pb-12">
          <div className="mx-auto mt-10 w-full max-w-5xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-3xl font-serif font-semibold text-white drop-shadow-sm sm:text-4xl">{t(language, "about.title")}</h1>
              <Link className="text-sm font-semibold text-white/90 hover:underline" href="/">
                {t(language, "about.back")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="bg-background px-5 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">
        <InfoCard title={t(language, "about.title")}>
          <p className="text-sm text-muted-foreground">{t(language, "about.intro")}</p>
        </InfoCard>

        <InfoCard title={t(language, "about.step_setup_title")}>
          <p className="text-sm text-muted-foreground">{t(language, "about.step_setup_body")}</p>
        </InfoCard>
        <InfoCard title={t(language, "about.step_schools_title")}>
          <p className="text-sm text-muted-foreground">{t(language, "about.step_schools_body")}</p>
        </InfoCard>
        <InfoCard title={t(language, "about.step_open_days_title")}>
          <p className="text-sm text-muted-foreground">{t(language, "about.step_open_days_body")}</p>
        </InfoCard>
        <InfoCard title={t(language, "about.step_shortlist_title")}>
          <p className="text-sm text-muted-foreground">{t(language, "about.step_shortlist_body")}</p>
        </InfoCard>
        <InfoCard title={t(language, "about.step_notes_title")}>
          <p className="text-sm text-muted-foreground">{t(language, "about.step_notes_body")}</p>
        </InfoCard>
        <InfoCard title={t(language, "about.step_print_title")}>
          <p className="text-sm text-muted-foreground">{t(language, "about.step_print_body")}</p>
        </InfoCard>
        <InfoCard title={t(language, "about.step_feedback_title")}>
          <p className="text-sm text-muted-foreground">{t(language, "about.step_feedback_body")}</p>
        </InfoCard>

        <div className="text-sm text-muted-foreground">{t(language, "about.good_luck")}</div>
        </div>
      </section>
    </main>
  );
}
