"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [lastEmail, setLastEmail] = useState<string | null>(null);
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
        setMessage("Please enter a valid email address.");
        return;
      }

      window.localStorage.setItem("last_login_email", trimmed);

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          // After clicking the email link, user returns to the app
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setStatus("sent");
      setMessage("Check your email for the sign-in link.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use a parent email. The app stays signed in on this device.
        </p>

        {lastEmail && !email && (
          <button
            className="text-sm underline"
            onClick={() => setEmail(lastEmail)}
            type="button"
          >
            Use last email: {lastEmail}
          </button>
        )}

        <form className="space-y-3" onSubmit={sendLink}>
          <label className="block space-y-1">
            <span className="text-sm">Email</span>
            <input
              className="w-full rounded-md border px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              autoComplete="email"
            />
          </label>

          <button
            className="w-full rounded-md border px-3 py-2"
            type="submit"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending..." : "Send sign-in link"}
          </button>
        </form>

        {message && (
          <p className={`text-sm ${status === "error" ? "text-red-600" : ""}`}>{message}</p>
        )}
      </div>
    </main>
  );
}