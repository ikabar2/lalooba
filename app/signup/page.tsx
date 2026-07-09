"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { useLanguage } from "@/lib/language-context";

// Same NANP (North American Numbering Plan) rule enforced at the database
// level in migration 007 — checked here too so the person gets an instant,
// friendly error instead of waiting on a round trip just to hit a generic
// database constraint failure.
const NANP_REGEX = /^\+1[2-9]\d{2}[2-9]\d{6}$/;

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  // Accept either 10 digits (416 555 1234) or 11 with a leading 1
  // (1 416 555 1234) — both are the same number, just typed differently.
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export default function SignUpPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone || !NANP_REGEX.test(normalizedPhone)) {
      setError(
        "Lalooba is currently only available in the US and Canada, or not yet available in your region."
      );
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone: normalizedPhone },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        // Some users (certain ISPs/regions) can't reach Supabase's auth
        // endpoint at the network layer — the request fails before it's
        // really processed, and Supabase surfaces a misleading
        // "not available in your country" style message. Detect that class
        // of failure and show something accurate + actionable instead of
        // implying we've geo-blocked them (we haven't).
        const msg = signUpError.message ?? "";
        const looksLikeNetworkOrRegionBlock =
          /country|region|not available|failed to fetch|network|load failed|timeout|unreachable/i.test(msg);

        if (looksLikeNetworkOrRegionBlock) {
          setError(
            "We're having trouble reaching the sign-up service from your network right now. " +
              "This is a temporary connection issue, not a restriction on your account. " +
              "Please try again in a moment, or try a different network (for example, switching " +
              "off a VPN, or from mobile data to Wi-Fi)."
          );
        } else {
          setError(msg || "We couldn't create your account. Please try again.");
        }
        setLoading(false);
        return;
      }

      // Supabase's signUp() deliberately returns an ambiguous, non-error
      // response for an email that's already registered — this prevents an
      // attacker from probing emails to discover who has an account here.
      // The practical sign of this case: a user object comes back, but no
      // session, and no identities array — a brand-new signup gets both.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError(
          "An account with this email already exists. Try logging in instead, or use 'Forgot password' if you don't remember it."
        );
        setLoading(false);
        return;
      }

      setLoading(false);
      setSubmitted(true);
    } catch (err) {
      setLoading(false);
      setError(
        "Sign up isn't available yet — the site isn't connected to a Supabase project. (.env.local missing or invalid.)"
      );
    }
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-navy-50 px-5">
        <Logo size="md" />
        <div className="max-w-sm rounded-xl border border-navy-100 bg-white p-6 text-center">
          <p className="mb-2 font-display text-xl text-navy-900">Check your email</p>
          <p className="text-sm text-navy-600">
            We sent a confirmation link to <strong>{email}</strong>. Click it to
            activate your account.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-navy-50 px-5 py-12">
      <Logo size="md" />

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-navy-100 bg-white p-6"
      >
        <h1 className="mb-1 font-display text-2xl font-medium text-navy-900">
          {t("signup")}
        </h1>
        <p className="mb-6 text-sm text-navy-600">
          Free to join. Browse first, sign up when you&apos;re ready to message or post.
        </p>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm leading-relaxed text-red-700">
            {error}
          </p>
        )}

        <label className="mb-1 block text-xs font-semibold text-navy-700">
          Full name
        </label>
        <input
          required
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mb-4 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
        />

        <label className="mb-1 block text-xs font-semibold text-navy-700">
          Phone number
        </label>
        <div className="mb-1 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-md border border-navy-100 bg-navy-50 px-2.5 py-2 text-sm font-medium text-navy-700">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.5v1a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 0H5.5a2 2 0 012 1.72c.13.81.34 1.6.63 2.36a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006 6l1.72-1.27a2 2 0 012.11-.45c.76.29 1.55.5 2.36.63A2 2 0 0122 16.5z" />
            </svg>
            +1
          </span>
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="416 555 1234"
            className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
          />
        </div>
        <p className="mb-4 text-xs text-navy-400">
          Lalooba is available to US &amp; Canada numbers only at this time.
        </p>

        <label className="mb-1 block text-xs font-semibold text-navy-700">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
        />

        <label className="mb-1 block text-xs font-semibold text-navy-700">
          Password
        </label>
        <input
          required
          minLength={8}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-navy-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
        >
          {loading ? "Creating account…" : t("signup")}
        </button>

        <p className="mt-4 text-center text-sm text-navy-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-navy-900 underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
