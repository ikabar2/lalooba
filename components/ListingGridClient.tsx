"use client";

import Link from "next/link";
import ListingCard, { Listing } from "./ListingCard";
import ScrollReveal from "./ScrollReveal";
import { useLanguage } from "@/lib/language-context";
import { getFeaturedIdSet } from "@/lib/featured";

export default function ListingGridClient({
  listings,
  detectedCity,
}: {
  listings: Listing[];
  detectedCity: string | null;
}) {
  const { t } = useLanguage();
  // Ranked against the *whole* catalog, not just this page's slice — a
  // listing that's featured is featured everywhere it appears (homepage
  // grid, marketplace results, seller profile), not recomputed per view.
  const featuredIds = getFeaturedIdSet(listings);

  return (
    <section id="marketplace" className="mx-auto max-w-6xl px-5 py-12">
      <ScrollReveal>
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="mb-1 text-xs font-extrabold tracking-wide text-gold-400">
              {t("marketplace_eyebrow")}
            </p>
            <h2 className="font-display text-2xl font-medium text-navy-900">
              {t("listings_heading")}
            </h2>
            {detectedCity && (
              <p className="text-xs text-navy-600">
                {t("near_you")} {detectedCity}
              </p>
            )}
          </div>
          <Link href="/marketplace" className="text-sm font-semibold text-navy-800 hover:text-gold-400">
            {t("see_all")}
          </Link>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {listings.map((listing, i) => (
          <ScrollReveal key={listing.id} delay={i * 70}>
            <ListingCard listing={listing} featured={featuredIds.has(listing.id)} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
