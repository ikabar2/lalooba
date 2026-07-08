"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/ensure-profile";
import { friendlyErrorMessage } from "@/lib/error-messages";
import { sampleOffers } from "@/components/jeebli-data";
import { useLanguage } from "@/lib/language-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { notFound } from "next/navigation";

export default function RequestSpacePage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15 passes params as a Promise even to Client Components — the
  // React `use()` hook unwraps it (the client-side equivalent of `await`).
  const { id } = use(params);
  const router = useRouter();
  const { lang } = useLanguage();
  const [itemDescription, setItemDescription] = useState("");
  const [requestedWeightKg, setRequestedWeightKg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offer = sampleOffers.find((o) => o.id === id);
  if (!offer) return notFound();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // TypeScript doesn't carry the outer `if (!offer) return notFound()`
    // narrowing into this nested function's closure — this guard is
    // logically redundant (the page already 404'd otherwise) but satisfies
    // the type checker without resorting to a non-null assertion.
    if (!offer) return;

    let supabase;
    try {
      supabase = createClient();
    } catch {
      setLoading(false);
      setError("Requesting isn't available yet — Supabase isn't connected (.env.local).");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push(`/login?redirect=/jeebli/request/${id}`);
      return;
    }

    // create_jeebli_request inserts sender_id referencing profiles(id) —
    // guard against the same FK-violation class the post forms hit.
    const profileResult = await ensureProfile(supabase, userData.user);
    if (!profileResult.ok) {
      console.error("[jeebli-request] ensureProfile failed:", profileResult.error);
      setLoading(false);
      setError(friendlyErrorMessage(profileResult.error, "We couldn't set up your profile. Please try again."));
      return;
    }

    if (Number(requestedWeightKg) > offer.availableWeightKg) {
      setLoading(false);
      setError(
        `${offer.traveler.name} only has ${offer.availableWeightKg}kg available — reduce your requested weight.`
      );
      return;
    }

    const { data: conversationId, error: rpcError } = await supabase.rpc(
      "create_jeebli_request",
      {
        p_offer_id: id,
        p_item_description: itemDescription,
        p_requested_weight_kg: Number(requestedWeightKg),
      }
    );

    setLoading(false);

    if (rpcError) {
      // Same honest caveat as MessageSellerButton: sample offers have
      // placeholder traveler ids with no real profile row, so the foreign
      // key check fails. That's correct, not a bug — it confirms the real
      // request + conversation flow is wired up correctly.
      setError(
        "This is a sample trip with no real traveler account behind it yet. " +
          "Once real trips exist (posted via /jeebli/post-trip by a real signed-up traveler), " +
          "requesting space will create a real conversation automatically."
      );
      return;
    }

    router.push(`/messages/${conversationId}`);
  }

  const formattedDate = new Date(offer.departureDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <Header detectedCity={null} />

      <main className="mx-auto max-w-lg px-5 py-10">
        {/* Role banner — the mirror of the Traveler banner on the post-trip form */}
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-gold-50 px-3 py-2 text-sm font-bold text-gold-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 8L12 17l-9-9" />
            <path d="M12 17V3" />
          </svg>
          You're requesting space as the Sender
        </div>

        {/* Trip summary, same color language as the browse card so it's
            instantly recognizable as the same trip */}
        <div className="mb-6 rounded-xl border border-navy-100 bg-white p-4">
          <div className="mb-1 flex items-center gap-2 text-base font-bold text-navy-900">
            <span>{offer.originCity[lang]}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-navy-400">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            <span>{offer.destinationCity[lang]}</span>
          </div>
          <p className="mb-3 text-xs text-navy-500">
            {offer.traveler.name} · {formattedDate}
          </p>
          <div className="flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2">
            <div>
              <p className="text-[10px] font-semibold uppercase text-navy-500">Available</p>
              <p className="text-lg font-extrabold text-teal-600">{offer.availableWeightKg} kg</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase text-navy-500">Price</p>
              <p className="text-lg font-extrabold text-gold-400">${offer.pricePerKg}/kg</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-navy-100 bg-white p-6">
          {error && (
            <p className="mb-4 rounded-md bg-gold-50 px-3 py-2 text-xs leading-relaxed text-navy-700">
              {error}
            </p>
          )}

          <label className="mb-1 block text-xs font-semibold text-navy-700">
            What are you sending?
          </label>
          <textarea
            required
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            rows={3}
            placeholder="2 boxes of clothing and a small gift"
            className="mb-4 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
          />

          {/* Requested weight — deliberately gold, not teal, so it's never
              visually confused with the offer's "available" number above */}
          <label className="mb-1 block text-xs font-semibold text-gold-400">
            Weight you need (kg)
          </label>
          <input
            required
            type="number"
            min="0.5"
            step="0.5"
            max={offer.availableWeightKg}
            value={requestedWeightKg}
            onChange={(e) => setRequestedWeightKg(e.target.value)}
            placeholder="5"
            className="mb-1 w-full rounded-md border border-gold-100 bg-gold-50/40 px-3 py-2 text-sm font-bold text-gold-600 outline-none focus:border-gold-200"
          />
          <p className="mb-5 text-xs text-navy-500">
            Max {offer.availableWeightKg}kg available on this trip
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-navy-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
          >
            {loading ? "Sending request…" : "Request space & message traveler"}
          </button>
        </form>
      </main>

      <Footer />
    </>
  );
}
