"use client";

import ListingCard from "./ListingCard";
import ScrollReveal from "./ScrollReveal";
import { sampleListings } from "./listings-data";
import { getFeaturedListings } from "@/lib/featured";
import { useLanguage } from "@/lib/language-context";

export default function FeaturedListings() {
  const { t } = useLanguage();
  const featured = getFeaturedListings(sampleListings);

  // Nothing currently featured (e.g. every recent listing aged past 24h) —
  // hide the whole section entirely. This is also what "no listings yet"
  // looks like on a brand-new deployment.
  if (featured.length === 0) return null;

  return (
    // A solid gold-tinted panel here (the earlier version) collided with
    // Jeeb Li's tinted panel right below it on the same page — same visual
    // language used for two different meanings ("different module" vs.
    // "premium placement"), which weakens both. This version keeps gold as
    // an *accent* (the thin top bar, the badge, per-card ring — unique to
    // this section) on top of a soft neutral gradient, so it reads as a
    // spotlight stage for the photos rather than another colored box.
    <section className="mx-auto max-w-6xl px-5 pt-8">
      <div className="overflow-hidden rounded-2xl border border-navy-100 bg-gradient-to-b from-navy-50/70 via-white to-white">
        <div className="h-1 bg-gradient-to-r from-gold-200 via-gold-100 to-gold-200" />

        <div className="px-5 pt-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy-900">
            <span aria-hidden>⭐</span> {t("featured_section_heading")}
          </h2>
          <p className="pb-4 text-xs text-navy-600">{t("featured_section_sub")}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 pt-0 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((listing, i) => (
            <ScrollReveal key={listing.id} delay={i * 60}>
              <ListingCard listing={listing} featured />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
