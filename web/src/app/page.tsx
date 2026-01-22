"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ADVIES_OPTIONS } from "@/lib/levels";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, readStoredLanguage, t } from "@/lib/i18n";
import { Wordmark } from "@/components/schoolkeuze";

const HERO_SCHOOLS = [
  {
    id: "hero-1",
    name: "Het Amsterdams Lyceum",
    image: "/branding/hero/school-1.jpg",
    distance: "1.2 km",
    students: "1.250",
    rating: "8.4",
    tags: ["Creatief", "Internationaal"],
    openDay: "15 januari",
  },
  {
    id: "hero-2",
    name: "Montessori Lyceum",
    image: "/branding/hero/school-2.jpg",
    distance: "2.1 km",
    students: "890",
    rating: "8.1",
    tags: ["Zelfstandig", "Kleinschalig"],
    openDay: "22 januari",
  },
  {
    id: "hero-3",
    name: "Barlaeus Gymnasium",
    image: "/branding/hero/school-3.jpg",
    distance: "0.8 km",
    students: "1.100",
    rating: "8.7",
    tags: ["Academisch", "Klassiek"],
    openDay: "18 januari",
  },
  {
    id: "hero-4",
    name: "IJburg College",
    image: "/branding/hero/school-4.jpg",
    distance: "3.5 km",
    students: "1.450",
    rating: "7.9",
    tags: ["Sportief", "Modern"],
    openDay: "20 januari",
  },
];

export default function ExploreHome() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [hasSession, setHasSession] = useState(false);
  const [searchStarted, setSearchStarted] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [postcode, setPostcode] = useState("");
  const [advies, setAdvies] = useState("");

  useEffect(() => {
    setLanguage(readStoredLanguage());
    const onLang = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next) setLanguage(next);
    };
    window.addEventListener(LANGUAGE_EVENT, onLang as EventListener);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLang as EventListener);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const heroTitle = t(language, "explore.hero_title");
  const heroSubtitle = t(language, "explore.hero_subtitle");
  const sectionTitle = searchStarted ? t(language, "explore.nearby") : t(language, "explore.popular");

  const toggleFavorite = (id: string) => {
    if (!hasSession) {
      router.push("/login");
      return;
    }
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const heroCards = useMemo(() => HERO_SCHOOLS, []);

  return (
    <main className="min-h-screen pb-24">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/branding/hero/hero-bg.jpg"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
        </div>
        <div className="relative px-5 pt-6 pb-12">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center">
              <Wordmark className="h-9" />
            </Link>
            <Link
              className="rounded-full border border-white/40 bg-white/90 px-4 py-2 text-sm font-semibold text-foreground shadow-sm"
              href={hasSession ? "/profile" : "/login"}
            >
              {hasSession ? t(language, "explore.profile") : t(language, "explore.login")}
            </Link>
          </div>

          <div className="mt-10 max-w-xl">
            <h1 className="font-serif text-3xl font-semibold text-white drop-shadow-sm sm:text-4xl">
              {heroTitle}
            </h1>
            <p className="mt-3 text-base text-white/90">{heroSubtitle}</p>
          </div>

          <div className="mt-8 rounded-3xl border border-white/30 bg-white/95 p-4 shadow-lg backdrop-blur">
            <div className="grid gap-3 sm:grid-cols-[1.1fr_1fr_auto]">
              <label className="flex flex-col gap-2 text-xs font-semibold text-muted-foreground">
                {t(language, "explore.search_postcode")}
                <input
                  className="h-11 rounded-2xl border bg-white px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary"
                  placeholder="1011 AB"
                  value={postcode}
                  onChange={(event) => setPostcode(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold text-muted-foreground">
                {t(language, "explore.search_advice")}
                <select
                  className="h-11 rounded-2xl border bg-white px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary"
                  value={advies}
                  onChange={(event) => setAdvies(event.target.value)}
                >
                  <option value="">{t(language, "settings.advies_select")}</option>
                  {ADVIES_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="h-11 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
                type="button"
                onClick={() => setSearchStarted(true)}
              >
                {t(language, "explore.search_cta")}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="px-5 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-foreground">{sectionTitle}</h2>
          <Link className="text-sm font-semibold text-primary hover:underline" href="/schools">
            {t(language, "explore.browse_all")}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {heroCards.map((school) => {
            const isFavorite = favorites.includes(school.id);
            return (
              <div key={school.id} className="overflow-hidden rounded-3xl border bg-card shadow-md">
                <div className="relative h-40">
                  <Image src={school.image} alt={school.name} fill className="object-cover" />
                  <button
                    className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-base shadow-sm transition ${
                      isFavorite ? "bg-primary text-primary-foreground" : "bg-white/90 text-foreground"
                    }`}
                    onClick={() => toggleFavorite(school.id)}
                    type="button"
                    aria-label="Toggle favorite"
                  >
                    {isFavorite ? "♥" : "♡"}
                  </button>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{school.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>📍 {school.distance}</span>
                      <span>👥 {school.students} leerlingen</span>
                      <span>⭐ {school.rating}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {school.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-secondary/70 px-3 py-1 text-xs font-semibold text-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">Open dag: {school.openDay}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
