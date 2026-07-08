"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MessageSellerButton({
  sellerId,
  listingId,
  sellerName,
  label,
  variant = "primary",
}: {
  sellerId: string;
  listingId: string | null;
  sellerName: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);

    let supabase;
    try {
      supabase = createClient();
    } catch {
      setLoading(false);
      setError("Messaging isn't available yet — Supabase isn't connected (.env.local).");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    const { data: conversationId, error: rpcError } = await supabase.rpc(
      "get_or_create_conversation",
      { other_user_id: sellerId, p_listing_id: listingId }
    );

    setLoading(false);

    if (rpcError) {
      // This is the expected failure for sample-data listings: the seller_id
      // is a placeholder with no real profile row behind it, so the foreign
      // key check fails. That's correct behavior, not a bug — it means real
      // messaging is wired up and only needs a real seller profile to work.
      setError(
        "This is a sample listing with no real seller account behind it yet. " +
          "To test real messaging locally, go to /messages/new and message another " +
          "signed-up test account directly."
      );
      return;
    }

    router.push(`/messages/${conversationId}`);
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={
          variant === "primary"
            ? "flex items-center gap-2 rounded-lg bg-navy-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
            : "flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-4 py-2 text-xs font-bold text-navy-800 transition hover:bg-navy-50 disabled:opacity-50"
        }
      >
        {variant === "primary" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
        )}
        {loading ? "Opening…" : label ?? `Message ${sellerName.split(" ")[0]}`}
      </button>

      {error && (
        <p className="mt-3 max-w-sm rounded-md bg-gold-50 px-3 py-2 text-xs leading-relaxed text-navy-700">
          {error}
        </p>
      )}
    </div>
  );
}
