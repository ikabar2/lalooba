"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyErrorMessage } from "@/lib/error-messages";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NewConversationPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let supabase;
    try {
      supabase = createClient();
      if (!supabase) throw new Error("supabase-unavailable");
    } catch {
      setLoading(false);
      setError("This isn't available right now. Please refresh and try again in a moment.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login?redirect=/messages/new");
      return;
    }

    if (email.trim().toLowerCase() === userData.user.email?.toLowerCase()) {
      setLoading(false);
      setError("You can't message yourself — sign up a second test account to try this.");
      return;
    }

    const { data: otherUserId, error: lookupError } = await supabase.rpc(
      "find_user_by_email",
      { lookup_email: email }
    );

    if (lookupError || !otherUserId) {
      setLoading(false);
      setError(
        `No registered user found with that email. Sign up a second test account at /signup first, then message that account's email here.`
      );
      return;
    }

    const { data: conversationId, error: rpcError } = await supabase.rpc(
      "get_or_create_conversation",
      { other_user_id: otherUserId, p_listing_id: null }
    );

    setLoading(false);

    if (rpcError) {
      console.error("[messages-new] get_or_create_conversation failed:", rpcError);
      setError(friendlyErrorMessage(rpcError, "We couldn't start that conversation. Please check the email and try again."));
      return;
    }

    router.push(`/messages/${conversationId}`);
  }

  return (
    <>
      <Header detectedCity={null} />

      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-5 py-12">
        <h1 className="mb-1 font-display text-2xl font-medium text-navy-900">
          Start a conversation
        </h1>
        <p className="mb-6 text-sm text-navy-600">
          Local testing tool — enter the email of another account you&apos;ve
          signed up to start messaging them. (In production, this happens via
          the &quot;Message seller&quot; button on a real listing instead.)
        </p>

        <form onSubmit={handleSubmit} className="rounded-xl border border-navy-100 bg-white p-6">
          {error && (
            <p className="mb-4 rounded-md bg-gold-50 px-3 py-2 text-xs leading-relaxed text-navy-700">
              {error}
            </p>
          )}

          <label className="mb-1 block text-xs font-semibold text-navy-700">
            Other user&apos;s email
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test-account-2@example.com"
            className="mb-4 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-navy-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
          >
            {loading ? "Looking up…" : "Start conversation"}
          </button>
        </form>
      </main>

      <Footer />
    </>
  );
}
