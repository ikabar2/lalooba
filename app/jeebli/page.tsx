import { cookies } from "next/headers";
import Link from "next/link";
import { sampleOffers } from "@/components/jeebli-data";
import JeebLiOfferCard from "@/components/JeebLiOfferCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { countryNames } from "@/lib/country-names";

export default async function JeebLiBrowsePage() {
  const cookieStore = await cookies();
  const detectedCity = cookieStore.get("lalooba-city")?.value ?? null;
  const detectedCountry = cookieStore.get("lalooba-country")?.value ?? null;

  // Same pattern as the marketplace grid: visitor's own country's incoming
  // trips (destination matches their detected country) float to the top.
  // Sorting uses the .en field as a stable key regardless of display
  // language — destinationCountry is now {en, ar} for bilingual display.
  const detectedCountryName =
    detectedCountry && detectedCountry in countryNames
      ? countryNames[detectedCountry as keyof typeof countryNames].en
      : null;

  const sortedOffers = detectedCountryName
    ? [...sampleOffers].sort((a, b) => {
        const aMatch = a.destinationCountry.en === detectedCountryName ? 0 : 1;
        const bMatch = b.destinationCountry.en === detectedCountryName ? 0 : 1;
        return aMatch - bMatch;
      })
    : sampleOffers;

  return (
    <>
      <Header detectedCity={detectedCity} />

      <div className="border-b border-gold-200/25 bg-gold-50/40">
        <main className="mx-auto max-w-6xl px-5 py-10">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-extrabold tracking-wide text-gold-400">
                ✈️ JEEB LI · TRAVEL DELIVERY SERVICE
              </p>
              <h1 className="font-display text-2xl font-medium text-navy-900">
                Jeeb Li — all trips
              </h1>
              <p className="max-w-xl text-sm text-navy-600">
                Travelers offering unused baggage space. Tap a trip to request space as a sender.
              </p>
              <p className="mt-1 max-w-xl text-xs italic text-navy-500">
                Not a marketplace listing — this is a travel-space service between travelers and senders.
              </p>
            </div>
            <Link
              href="/jeebli/post-trip"
              className="rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800"
            >
              ✈ Post a trip
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedOffers.map((offer) => (
              <JeebLiOfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}
