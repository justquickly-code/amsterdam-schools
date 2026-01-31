"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_LANGUAGE, Language, emitLanguageChanged, readStoredLanguage, setStoredLanguage, t } from "@/lib/i18n";
import { buttonOutlineSmall, buttonPrimaryWide } from "@/lib/ui";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [hydrated, setHydrated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [resolvedOrigin, setResolvedOrigin] = useState("");
  const router = useRouter();

  useEffect(() => {
    setLanguage(readStoredLanguage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        router.replace("/profile");
      } else {
        setCheckingSession(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!hydrated) return;
    setStoredLanguage(language);
    emitLanguageChanged(language);
  }, [language, hydrated]);

  useEffect(() => {
    const envOrigin = process.env.NEXT_PUBLIC_SITE_URL;
    const windowOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const isVercelPreview = typeof window !== "undefined" && window.location.hostname.endsWith("vercel.app");
    const origin = isVercelPreview
      ? windowOrigin
      : envOrigin && envOrigin.length > 0
        ? envOrigin.replace(/\/$/, "")
        : windowOrigin;
    setResolvedOrigin(origin);
  }, []);

  const toggleLanguage = () => {
    const next = language === "nl" ? "en" : "nl";
    setLanguage(next);
    if (typeof window !== "undefined") {
      setStoredLanguage(next);
      emitLanguageChanged(next);
    }
  };
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const stored = window.localStorage.getItem("last_login_email");
    if (stored) setLastEmail(stored);
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !trimmed.includes("@")) {
        setStatus("error");
        setMessage(t(language, "login.invalid_email"));
        return;
      }

      window.localStorage.setItem("last_login_email", trimmed);

      const envOrigin = process.env.NEXT_PUBLIC_SITE_URL;
      const windowOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const isVercelPreview = typeof window !== "undefined" && window.location.hostname.endsWith("vercel.app");
      const origin = isVercelPreview
        ? windowOrigin
        : envOrigin && envOrigin.length > 0
          ? envOrigin.replace(/\/$/, "")
          : windowOrigin;
      const setupFlag =
        typeof window !== "undefined" &&
        (window.localStorage.getItem("prefill_postcode") || window.localStorage.getItem("prefill_advies"))
          ? "&setup=1"
          : "";
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          // After clicking the email link, user returns to the app
          emailRedirectTo: `${origin}/auth/callback?lang=${language}${setupFlag}`,
        },
      });

      if (error) throw error;

      setStatus("sent");
      setMessage(t(language, "login.sent"));
    } catch (err: unknown) {
      setStatus("error");
      setMessage(errMsg(err) ?? "Something went wrong. Please try again.");
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <div className="relative min-h-screen">
        <div className="absolute inset-0">
          <Image src="/branding/hero/hero-bg.jpg" alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
        </div>
        <div className="relative mx-auto w-full max-w-md space-y-4 px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-sm font-semibold text-white">
              <Image
                src="/branding/mijnschoolkeuze_kit_v4/logo-mark.png"
                alt="Mijn Schoolkeuze"
                width={24}
                height={24}
                className="h-6 w-6"
                priority
              />
              <span className="font-serif">mijn schoolkeuze</span>
            </div>
            <button
              className={buttonOutlineSmall}
              type="button"
              onClick={toggleLanguage}
            >
              {language === "nl" ? "NL" : "EN"}
            </button>
          </div>
          <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
            <h1 className="text-2xl font-serif font-semibold">{t(language, "login.title")}</h1>
            <p className="text-sm text-muted-foreground">{t(language, "login.subtitle")}</p>

          {lastEmail && !email && (
            <button className="text-sm underline" onClick={() => setEmail(lastEmail)} type="button">
              {t(language, "login.use_last")}: {lastEmail}
            </button>
          )}

          <form className="space-y-3" onSubmit={sendLink}>
            <label className="block space-y-1">
              <span className="text-sm">{t(language, "login.email")}</span>
              <input
                className="h-11 w-full rounded-2xl border bg-background px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <button
              className={buttonPrimaryWide}
              type="submit"
              disabled={status === "sending"}
            >
              {status === "sending" ? t(language, "login.sending") : t(language, "login.send_link")}
            </button>
          </form>

        {message && (
          <p className={`text-sm ${status === "error" ? "text-red-600" : ""}`}>{message}</p>
        )}
        {status === "sent" && (
          <p className="text-xs text-muted-foreground">{t(language, "login.spam_hint")}</p>
        )}
        {resolvedOrigin ? (
          <p className="text-xs text-muted-foreground">
            Debug redirect: <span className="font-semibold">{resolvedOrigin}</span>
          </p>
        ) : null}
        </div>
      </div>
      </div>
    </main>
  );
}
