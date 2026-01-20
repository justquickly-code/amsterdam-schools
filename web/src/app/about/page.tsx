"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";

export default function AboutPage() {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    setLanguage(readStoredLanguage());
    const onLang = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next) setLanguage(next);
    };
    window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
  }, []);

  return (
    <main className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-3xl rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t(language, "about.title")}</h1>
          <Link className="text-sm underline" href="/">
            {t(language, "about.back")}
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">{t(language, "about.intro")}</p>

        <div className="space-y-3 text-sm">
          <div>
            <div className="font-medium">{t(language, "about.step_setup_title")}</div>
            <div className="text-muted-foreground">{t(language, "about.step_setup_body")}</div>
          </div>
          <div>
            <div className="font-medium">{t(language, "about.step_schools_title")}</div>
            <div className="text-muted-foreground">{t(language, "about.step_schools_body")}</div>
          </div>
          <div>
            <div className="font-medium">{t(language, "about.step_open_days_title")}</div>
            <div className="text-muted-foreground">{t(language, "about.step_open_days_body")}</div>
          </div>
          <div>
            <div className="font-medium">{t(language, "about.step_shortlist_title")}</div>
            <div className="text-muted-foreground">{t(language, "about.step_shortlist_body")}</div>
          </div>
          <div>
            <div className="font-medium">{t(language, "about.step_notes_title")}</div>
            <div className="text-muted-foreground">{t(language, "about.step_notes_body")}</div>
          </div>
          <div>
            <div className="font-medium">{t(language, "about.step_print_title")}</div>
            <div className="text-muted-foreground">{t(language, "about.step_print_body")}</div>
          </div>
          <div>
            <div className="font-medium">{t(language, "about.step_feedback_title")}</div>
            <div className="text-muted-foreground">{t(language, "about.step_feedback_body")}</div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">{t(language, "about.good_luck")}</div>
      </div>
    </main>
  );
}
