"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/ensure-profile";
import { friendlyErrorMessage } from "@/lib/error-messages";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PostTripPage() {
  const router = useRouter();
  const [originCity, setOriginCity] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [availableWeightKg, setAvailableWeightKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [allowedItems, setAllowedItems] = useState("");
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
      router.push("/login?redirect=/jeebli/post-trip");
      return;
    }

    // Guarantee a profiles row exists before the insert — jeeb_li_offers
    // .traveler_id references profiles(id), so without this a user whose
    // profile was never created hits "violates foreign key constraint
    // jeeb_li_offers_traveler_id_fkey". ensureProfile is a no-op when the
    // profile already exists (the normal case).
    const profileResult = await ensureProfile(supabase, userData.user);
    if (!profileResult.ok) {
      console.error("[post-trip] ensureProfile failed:", profileResult.error);
      setLoading(false);
      setError(friendlyErrorMessage(profileResult.error, "We couldn't set up your profile. Please try again."));
      return;
    }

    // Derive which CA/US market this trip belongs to from its destination,
    // so the marketplace switcher can filter Jeeb Li the same way it filters
    // listings. Left null if neither CA nor US — the DB column is nullable.
    const dest = destinationCountry.toLowerCase();
    const marketCountry = /canada|^ca$/.test(dest)
      ? "CA"
      : /united states|usa|^us$/.test(dest)
        ? "US"
        : null;

    const { error: insertError } = await supabase.from("jeeb_li_offers").insert({
      traveler_id: userData.user.id,
      origin_city: originCity,
      origin_country: originCountry,
      destination_city: destinationCity,
      destination_country: destinationCountry,
      market_country: marketCountry,
      departure_date: departureDate,
      available_weight_kg: Number(availableWeightKg),
      price_per_kg: Number(pricePerKg),
      allowed_items: allowedItems,
    });

    setLoading(false);

    if (insertError) {
      console.error("[post-trip] Insert failed:", insertError);
      setError(friendlyErrorMessage(insertError, "We couldn't post your trip. Please try again."));
      return;
    }

    router.push("/jeebli");
  }

  return (
    <>
      <Header detectedCity={null} />

      <main className="mx-auto max-w-lg px-5 py-10">
        {/* Role banner — unambiguous which side of Jeeb Li this form is for */}
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-bold text-teal-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 16.5v1a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 0H5.5a2 2 0 012 1.72c.13.81.34 1.6.63 2.36a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006 6l1.72-1.27a2 2 0 012.11-.45c.76.29 1.55.5 2.36.63A2 2 0 0122 16.5z" />
          </svg>
          You're posting as the Traveler
        </div>

        <h1 className="mb-1 font-display text-2xl font-medium text-navy-900">Post a trip</h1>
        <p className="mb-6 text-sm text-navy-600">
          Share your unused baggage space. Senders will request space and message you directly.
        </p>

        <form onSubmit={handleSubmit} className="rounded-xl border border-navy-100 bg-white p-6">
          {error && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy-700">Origin city</label>
              <input
                required
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                placeholder="Casablanca"
                className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy-700">Origin country</label>
              <input
                required
                value={originCountry}
                onChange={(e) => setOriginCountry(e.target.value)}
                placeholder="Morocco"
                className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy-700">
                Destination city
              </label>
              <input
                required
                value={destinationCity}
                onChange={(e) => setDestinationCity(e.target.value)}
                placeholder="Montreal"
                className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy-700">
                Destination country
              </label>
              <input
                required
                value={destinationCountry}
                onChange={(e) => setDestinationCountry(e.target.value)}
                placeholder="Canada"
                className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
              />
            </div>
          </div>

          <label className="mb-1 block text-xs font-semibold text-navy-700">Departure date</label>
          <input
            required
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            className="mb-4 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
          />

          {/* Weight + price — the two numbers senders scan for, highlighted
              here too so the traveler understands what they're committing to */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-teal-600">
                Available weight (kg)
              </label>
              <input
                required
                type="number"
                min="0.5"
                step="0.5"
                value={availableWeightKg}
                onChange={(e) => setAvailableWeightKg(e.target.value)}
                placeholder="12"
                className="w-full rounded-md border border-teal-200 bg-teal-50/40 px-3 py-2 text-sm font-bold text-teal-700 outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gold-400">
                Price per kg ($)
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.5"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                placeholder="6"
                className="w-full rounded-md border border-gold-100 bg-gold-50/40 px-3 py-2 text-sm font-bold text-gold-600 outline-none focus:border-gold-200"
              />
            </div>
          </div>

          <label className="mb-1 block text-xs font-semibold text-navy-700">
            Allowed items / restrictions
          </label>
          <textarea
            required
            value={allowedItems}
            onChange={(e) => setAllowedItems(e.target.value)}
            rows={3}
            placeholder="Clothing and documents only, no liquids or electronics"
            className="mb-5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-navy-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
          >
            {loading ? "Posting…" : "Post trip"}
          </button>
        </form>
      </main>

      <Footer />
    </>
  );
}
