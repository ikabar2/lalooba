"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";
import { useLanguage } from "@/lib/language-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      // Sends the reset email. redirectTo is where the link lands the user —
      // our update-password page, which must also be in Supabase's Auth
      // redirect allowlist. resetPasswordForEmail deliberately resolves
      // without error even if the address isn't registered, so we never
      // reveal which emails have accounts.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${getSiteUrl()}/reset-password`,
      });

      if (resetError) {
        console.error("[forgot-password] error:", resetError);
        const msg = (resetError.message ?? "").toLowerCase();
        const status = (resetError as { status?: number }).status;

        // Distinguish the real failure modes so the user gets an accurate,
        // actionable message rather than a misleading "check the address"
        // (the address is almost never the actual problem here).
        if (status === 429 || /rate limit|too many|exceeded/.test(msg)) {
          // Supabase throttles reset emails (and the default sender is capped
          // at ~2/hour until custom SMTP is configured). This is the most
          // common cause of this failure on a project that hasn't finished
          // email setup.
          setError(
            "Too many requests right now. Please wait a few minutes and try again. " +
              "If this keeps happening, email sending may not be fully set up yet."
          );
        } else if (
          /redirect|url|not allowed|invalid.*url/.test(msg)
        ) {
          // redirectTo isn't in the Supabase Auth allowlist.
          setError(
            "We couldn't start the password reset due to a configuration issue. " +
              "Please contact support so we can fix it."
          );
        } else if (/smtp|email|send|provider|relay/.test(msg)) {
          // Email delivery isn't configured / SMTP error.
          setError(
            "Password reset email couldn't be sent right now — our email service may be temporarily unavailable. " +
              "Please try again shortly."
          );
        } else if (/network|failed to fetch|load failed|timeout/.test(msg)) {
          setError(
            "We couldn't reach the reset service from your network. Please try again, " +
              "or switch networks (e.g. turn off a VPN, or from Wi-Fi to mobile data)."
          );
        } else {
          // Surface the real Supabase message so configuration issues
          // (SMTP not set up, redirect URL not allowlisted, etc.) are
          // diagnosable instead of hidden behind a generic string.
          setError(
            resetError.message
              ? `We couldn't send the reset email: ${resetError.message}`
              : "We couldn't send the reset email right now. Please try again in a moment."
          );
        }
        setLoading(false);
        return;
      }

      // Always show the same success state regardless of whether the email
      // exists — no account enumeration.
      setSent(true);
      setLoading(false);
    } catch (err) {
      console.error("[forgot-password] threw:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <Header detectedCity={null} />
      <main className="mx-auto flex max-w-md flex-col px-5 py-12">
        <h1 className="mb-2 font-display text-2xl font-medium text-navy-900">
          {t("forgot_password_title")}
        </h1>

        {sent ? (
          <div className="rounded-xl border border-navy-100 bg-white p-6">
            <p className="text-sm leading-relaxed text-navy-700">{t("forgot_password_sent")}</p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-semibold text-orange-600 hover:underline"
            >
              {t("back_to_login")}
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm leading-relaxed text-navy-600">
              {t("forgot_password_subtitle")}
            </p>
            {error && (
              <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy-700">
                  {t("email_label")}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-navy-200 px-3 py-2 text-sm outline-none focus:border-navy-400"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {loading ? t("sending") : t("send_reset_link")}
              </button>
            </form>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-semibold text-navy-600 hover:underline"
            >
              {t("back_to_login")}
            </Link>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
