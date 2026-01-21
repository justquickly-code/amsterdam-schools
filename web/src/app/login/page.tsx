"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, emitLanguageChanged, t } from "@/lib/i18n";
import { Wordmark } from "@/components/schoolkeuze";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [hydrated, setHydrated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = window.localStorage.getItem("schools_language");
    if (stored === "en" || stored === "nl") {
      setLanguage(stored);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        router.replace("/");
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
    window.localStorage.setItem("schools_language", language);
    emitLanguageChanged(language);
  }, [language, hydrated]);

  const toggleLanguage = () => {
    const next = language === "nl" ? "en" : "nl";
    setLanguage(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("schools_language", next);
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

      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          // After clicking the email link, user returns to the app
          emailRedirectTo: `${origin}/auth/callback?lang=${language}`,
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
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="flex items-center justify-center">
            <Wordmark className="h-10" />
          </div>
          <div className="rounded-2xl border bg-card p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t(hydrated ? language : DEFAULT_LANGUAGE, "settings.language")}
              </div>
              <button
                className="rounded-full border px-3 py-1 text-xs"
                type="button"
                onClick={toggleLanguage}
              >
                {language === "nl" ? "NL" : "EN"}
              </button>
            </div>
            <h1 className="text-2xl font-semibold">{t(language, "login.title")}</h1>
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
                className="w-full rounded-2xl border bg-background px-4 py-2"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="family@example.com"
                autoComplete="email"
              />
            </label>

            <button
              className="w-full rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
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
        </div>
      </div>
    </main>
  );
}
