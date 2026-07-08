"use client";

import { Suspense } from "react";
import Link from "next/link";
import ListingCard, { Listing } from "./ListingCard";
import Breadcrumbs, { type Crumb } from "./Breadcrumbs";
import MarketSwitcher from "./MarketSwitcher";
import { categoryIcons } from "./Header";
import { getFeaturedIdSet } from "@/lib/featured";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/translations";

export default function MarketplaceResults({
  results,
  query,
  category,
  market,
}: {
  results: Listing[];
  query: string | null;
  category: TranslationKey | null;
  market: "CA" | "US" | null;
}) {
  const { t } = useLanguage();
  const hasCategory = category && category !== "cat_all";
  // Featured status is computed over the listings actually being shown
  // (real DB listings + sample), merged with the full sample catalog so a
  // sample listing keeps its featured badge even when the current view is
  // filtered. getFeaturedIdSet de-dupes internally by id.
  const featuredIds = getFeaturedIdSet(results);

  // Breadcrumb trail mirrors the one on product pages
  // (components/ListingDetailBody.tsx) so the Home → Marketplace → Category
  // path is consistent whether you're looking at a category listing grid or
  // an individual product. The category crumb only appears when actually
  // filtered to one — a plain "/marketplace" view stops at Marketplace.
  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    hasCategory
      ? { label: "Marketplace", href: "/marketplace" }
      : { label: "Marketplace" },
  ];
  if (hasCategory) {
    crumbs.push({ label: t(category as TranslationKey) });
  }

  return (
    <>
      <Breadcrumbs items={crumbs} />

      {/* Canada / US market switcher — useSearchParams inside it means it
          must be wrapped in Suspense so it doesn't opt the whole results
          view into dynamic rendering. */}
      <div className="mb-5">
        <Suspense fallback={null}>
          <MarketSwitcher current={market} />
        </Suspense>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium text-navy-900">
          {query ? `${t("search_results_for")} "${query}"` : t("all_listings_heading")}
        </h1>

        {hasCategory && (
          <Link
            href="/marketplace"
            className="flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-50 px-3 py-1.5 text-xs font-bold text-gold-400 transition hover:bg-gold-100/60"
          >
            <span aria-hidden>{categoryIcons[category as TranslationKey]}</span>
            {t(category as TranslationKey)}
            <span aria-hidden className="ml-1 text-navy-600">
              ✕ {t("clear_filter")}
            </span>
          </Link>
        )}
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-navy-600">{t("no_listings_match")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((listing) => (
            <ListingCard key={listing.id} listing={listing} featured={featuredIds.has(listing.id)} />
          ))}
        </div>
      )}
    </>
  );
}
