"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { useLanguage } from "@/lib/language-context";

function LoginForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Deliberately generic — don't reveal whether the email exists or the
        // password was wrong specifically, that distinction helps attackers
        // enumerate valid accounts.
        setError("Incorrect email or password.");
        setLoading(false);
        return;
      }

      // Several flows (Message seller, Post a listing, header Post button)
      // redirect here with ?redirect=/wherever-they-were-going — honor it,
      // falling back to home if it's absent.
      const redirectTo = searchParams.get("redirect") || "/";
      router.push(redirectTo);
      router.refresh(); // re-runs Server Components so the header reflects the new session
    } catch (err) {
      setLoading(false);
      setError(
        "Log in isn't available yet — the site isn't connected to a Supabase project. (.env.local missing or invalid.)"
      );
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-navy-50 px-5 py-12">
      <Logo size="md" />

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-navy-100 bg-white p-6"
      >
        <h1 className="mb-1 font-display text-2xl font-medium text-navy-900">
          {t("login")}
        </h1>
        <p className="mb-6 text-sm text-navy-600">Welcome back.</p>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

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
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-2 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
        />

        <div className="mb-6 text-right">
          <Link href="/forgot-password" className="text-xs font-semibold text-orange-600 hover:underline">
            {t("forgot_password_link")}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-navy-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
        >
          {loading ? "Logging in…" : t("login")}
        </button>

        <p className="mt-4 text-center text-sm text-navy-600">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-navy-900 underline">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
