"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { InfoCard, Wordmark } from "@/components/schoolkeuze";

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
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-col gap-2">
          <Wordmark />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-semibold text-foreground">{t(language, "about.title")}</h1>
            <Link className="text-sm font-semibold text-primary hover:underline" href="/">
              {t(language, "about.back")}
            </Link>
          </div>
        </header>

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
    </main>
  );
}
