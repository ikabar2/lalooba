"use client";

import { useLanguage } from "@/lib/language-context";
import type { Seller, Review } from "./sellers-data";
import type { Listing } from "./ListingCard";
import ListingCard from "./ListingCard";
import Breadcrumbs from "./Breadcrumbs";
import MessageSellerButton from "./MessageSellerButton";
import ScrollReveal from "./ScrollReveal";
import { getFeaturedIdSet } from "@/lib/featured";
import { countryNames } from "@/lib/country-names";
import { bi } from "@/lib/bilingual";
import { sampleListings } from "./listings-data";

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span aria-hidden className="text-gold-200">
      {"★".repeat(full)}
      <span className="text-navy-100">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export default function SellerProfileBody({
  seller,
  reviews,
  otherListings,
}: {
  seller: Seller;
  reviews: Review[];
  otherListings: Listing[];
}) {
  const { lang, t } = useLanguage();
  const featuredIds = getFeaturedIdSet(sampleListings);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Marketplace", href: "/marketplace" },
          { label: seller.name },
        ]}
      />

      {/* Profile header card */}
      <div className="mb-8 flex flex-col gap-5 rounded-2xl border border-navy-100 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-navy-900 text-lg font-bold text-white">
            {seller.avatarInitials}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-medium text-navy-900">{seller.name}</h1>
              {seller.verified ? (
                <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-600">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  {t("seller_verified")}
                </span>
              ) : (
                <span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-semibold text-navy-600">
                  {t("seller_not_verified")}
                </span>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-navy-600">
              <span className="flex items-center gap-1">
                <Stars rating={seller.rating} />
                <span className="font-semibold text-navy-800">{seller.rating.toFixed(1)}</span>
                <span>({seller.reviewCount})</span>
              </span>
              <span>
                {seller.city[lang]}, {bi(countryNames[seller.country], lang)}
              </span>
              <span>
                {t("seller_active_since")} {seller.activeSince}
              </span>
            </p>
          </div>
        </div>

        <MessageSellerButton
          sellerId={`00000000-0000-0000-0000-0000000000${seller.id.replace("s", "").padStart(2, "0")}`}
          listingId={null}
          sellerName={seller.name}
        />
      </div>

      <p className="mb-10 max-w-2xl text-sm leading-relaxed text-navy-700">{seller.bio[lang]}</p>

      {/* Other listings from this seller */}
      <section className="mb-10">
        <h2 className="mb-4 font-display text-lg font-bold text-navy-900">
          {t("seller_other_listings")}
        </h2>
        {otherListings.length === 0 ? (
          <p className="text-sm text-navy-600">{t("seller_no_other_listings")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {otherListings.map((listing, i) => (
              <ScrollReveal key={listing.id} delay={i * 60}>
                <ListingCard listing={listing} featured={featuredIds.has(listing.id)} />
              </ScrollReveal>
            ))}
          </div>
        )}
      </section>

      {/* Reviews */}
      <section>
        <h2 className="mb-4 font-display text-lg font-bold text-navy-900">
          {t("seller_reviews_heading")}
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-navy-600">{t("seller_no_reviews")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-navy-100 bg-white p-4">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-navy-900">{review.reviewerName}</p>
                  <span className="text-xs text-navy-500">{review.date}</span>
                </div>
                <Stars rating={review.rating} />
                <p className="mt-1.5 text-sm leading-relaxed text-navy-700">{review.comment[lang]}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
