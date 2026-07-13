"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientAsync } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/password";
import { useLanguage } from "@/lib/language-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Landing page for the password-reset email link. supabase-js parses the
// recovery token from the URL fragment on load and establishes a temporary
// recovery session, emitting a PASSWORD_RECOVERY event. We wait for a valid
// session before allowing the update, so a direct visit (no valid token)
// can't set a password. On success we sign out and send them to login, so
// the new password is what actually gets used.
export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const [ready, setReady] = useState(false); // valid recovery session present
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const supabase = await createClientAsync();
      if (!supabase) {
        setChecking(false);
        return;
      }
      if (cancelled) return;

      // The recovery link creates a session; listen for it. Also check the
      // current session directly in case the event fired before we subscribed.
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" || session) {
          setReady(true);
          setChecking(false);
        }
      });
      unsub = () => listener.subscription.unsubscribe();

      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setReady(true);
        }
        setChecking(false);
      });
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) {
      setError(pwCheck.reason);
      return;
    }
    if (password !== confirm) {
      setError(t("passwords_dont_match"));
      return;
    }

    setLoading(true);
    try {
      const supabase = await createClientAsync();
      if (!supabase) throw new Error("supabase-unavailable");
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        console.error("[reset-password] update failed:", updateError);
        setError(updateError.message || t("reset_failed"));
        setLoading(false);
        return;
      }

      // Password changed. Sign out the temporary recovery session so the user
      // logs in fresh with the new password.
      await supabase.auth.signOut().catch(() => {});
      setDone(true);
      setLoading(false);
    } catch (err) {
      console.error("[reset-password] threw:", err);
      setError(t("reset_failed"));
      setLoading(false);
    }
  }

  return (
    <>
      <Header detectedCity={null} />
      <main className="mx-auto flex max-w-md flex-col px-5 py-12">
        <h1 className="mb-2 font-display text-2xl font-medium text-navy-900">
          {t("reset_password_title")}
        </h1>

        {checking ? (
          <p className="text-sm text-navy-600">{t("loading")}</p>
        ) : done ? (
          <div className="rounded-xl border border-navy-100 bg-white p-6">
            <p className="mb-4 text-sm leading-relaxed text-navy-700">{t("reset_success")}</p>
            <Link
              href="/login"
              className="inline-block rounded-md bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              {t("go_to_login")}
            </Link>
          </div>
        ) : !ready ? (
          <div className="rounded-xl border border-red-100 bg-red-50/50 p-6">
            <p className="mb-4 text-sm leading-relaxed text-navy-700">{t("reset_invalid_link")}</p>
            <Link
              href="/forgot-password"
              className="inline-block text-sm font-semibold text-orange-600 hover:underline"
            >
              {t("request_new_link")}
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm leading-relaxed text-navy-600">
              {t("reset_password_subtitle")}
            </p>
            {error && (
              <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy-700">
                  {t("new_password_label")}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-navy-200 px-3 py-2 text-sm outline-none focus:border-navy-400"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <p className="mt-1 text-[11px] text-navy-500">{t("password_requirement_hint")}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy-700">
                  {t("confirm_password_label")}
                </label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-md border border-navy-200 px-3 py-2 text-sm outline-none focus:border-navy-400"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {loading ? t("updating") : t("update_password")}
              </button>
            </form>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
