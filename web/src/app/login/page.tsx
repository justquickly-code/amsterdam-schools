"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_LANGUAGE, Language, LANGUAGE_EVENT, emitLanguageChanged, t } from "@/lib/i18n";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    const stored = window.localStorage.getItem("schools_language");
    return stored === "en" || stored === "nl" ? stored : DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("schools_language", language);
    emitLanguageChanged(language);
  }, [language]);
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

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          // After clicking the email link, user returns to the app
          emailRedirectTo: "http://localhost:3000/auth/callback",
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

  return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{t(language, "settings.language")}</div>
            <button
              className="rounded-full border px-3 py-1 text-xs"
              type="button"
              onClick={() => setLanguage(language === "nl" ? "en" : "nl")}
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
              className="w-full rounded-md border px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="family@example.com"
              autoComplete="email"
            />
          </label>

          <button
            className="w-full rounded-md border px-3 py-2"
            type="submit"
            disabled={status === "sending"}
          >
            {status === "sending" ? t(language, "login.sending") : t(language, "login.send_link")}
          </button>
        </form>

        {message && (
          <p className={`text-sm ${status === "error" ? "text-red-600" : ""}`}>{message}</p>
        )}
      </div>
    </main>
  );
}
