import { cookies } from "next/headers";
import Link from "next/link";
import { fetchJeebLiOffers } from "@/lib/jeebli-query";
import JeebLiOfferCard from "@/components/JeebLiOfferCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { countryNames } from "@/lib/country-names";

export const dynamic = "force-dynamic";

export default async function JeebLiBrowsePage() {
  const cookieStore = await cookies();
  const detectedCity = cookieStore.get("lalooba-city")?.value ?? null;
  const detectedCountry = cookieStore.get("lalooba-country")?.value ?? null;

  const offers = await fetchJeebLiOffers();

  // Visitor's own country's incoming trips (destination matches their
  // detected country) float to the top. destination_country is free text, so
  // match loosely against the country name.
  const detectedCountryName =
    detectedCountry && detectedCountry in countryNames
      ? countryNames[detectedCountry as keyof typeof countryNames].en
      : null;

  const sortedOffers = detectedCountryName
    ? [...offers].sort((a, b) => {
        const aMatch = a.destinationCountry.en.toLowerCase().includes(detectedCountryName.toLowerCase()) ? 0 : 1;
        const bMatch = b.destinationCountry.en.toLowerCase().includes(detectedCountryName.toLowerCase()) ? 0 : 1;
        return aMatch - bMatch;
      })
    : offers;

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

          {sortedOffers.length === 0 ? (
            <div className="rounded-xl border border-navy-100 bg-white p-10 text-center">
              <p className="mb-1 font-display text-lg text-navy-900">No trips posted yet</p>
              <p className="text-sm text-navy-600">
                Be the first — post a trip and offer your unused baggage space.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedOffers.map((offer) => (
                <JeebLiOfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </>
  );
}
