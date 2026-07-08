"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { Listing } from "./ListingCard";
import { countryNames, sampleListings } from "./listings-data";
import { bi } from "@/lib/bilingual";
import { getFeaturedIdSet } from "@/lib/featured";
import MessageSellerButton from "./MessageSellerButton";
import ImageGallery from "./ImageGallery";
import Breadcrumbs from "./Breadcrumbs";

export default function ListingDetailBody({ listing }: { listing: Listing }) {
  const { lang, t } = useLanguage();
  const isFeatured = getFeaturedIdSet(sampleListings).has(listing.id);
  const isSold = listing.availability === "sold";
  // A real posted listing has a UUID id and a real seller UUID behind it;
  // sample listings use short ids ("l1") with no real account. This gates
  // whether "message seller" opens a real conversation.
  const isRealListing =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listing.sellerId);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Marketplace", href: "/marketplace" },
          { label: t(listing.category), href: `/marketplace?category=${listing.category}` },
          { label: listing.title[lang] },
        ]}
      />

      <div className="grid gap-8 sm:grid-cols-2">
        <ImageGallery images={listing.images} alt={listing.title[lang]} />

        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {isFeatured && !isSold && (
              <span className="rounded-full bg-gold-200 px-2.5 py-0.5 text-xs font-extrabold text-white shadow-sm">
                {t("featured_badge")}
              </span>
            )}
            {isSold && (
              <span className="rounded-full bg-navy-900 px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-white">
                {t("sold_badge")}
              </span>
            )}
          </div>
          <h1 className="mb-1 font-display text-2xl font-medium text-navy-900">
            {listing.title[lang]}
          </h1>
          <p className="mb-3 text-xl font-bold text-navy-800">${listing.price}</p>
          <p className="mb-6 flex items-center gap-1.5 text-sm text-navy-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            {listing.city[lang]}, {bi(countryNames[listing.country], lang)}
          </p>

          <div className="mb-4 flex items-center gap-3 rounded-lg border border-navy-100 bg-white p-3">
            <Link
              href={`/seller/${listing.sellerId}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-bold text-navy-900"
            >
              {listing.seller.avatarInitials}
            </Link>
            <div>
              <Link href={`/seller/${listing.sellerId}`} className="text-sm font-semibold text-navy-900 hover:underline">
                {listing.seller.name}
              </Link>
              {listing.seller.verified && (
                <p className="flex items-center gap-1 text-xs text-teal-600">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  {t("seller_verified")}
                </p>
              )}
              <Link href={`/seller/${listing.sellerId}`} className="text-xs font-semibold text-gold-400 hover:underline">
                {t("seller_view_profile")}
              </Link>
            </div>
          </div>

          {/*
            For REAL listings, listing.sellerId is the seller's profile UUID
            (profiles.id === their auth UID), which is exactly what
            get_or_create_conversation needs — so we pass it straight through.
            Sample listings use non-UUID ids ("l1"...) and a synthetic
            sellerId that has no real account behind it; MessageSellerButton
            detects that and shows the "sample listing" notice instead of
            trying to open a real conversation.
          */}
          <MessageSellerButton
            sellerId={listing.sellerId}
            listingId={isRealListing ? listing.id : null}
            sellerName={listing.seller.name}
          />

          {/* Delivery/pickup question — separate, lower-emphasis prompt from
              the main "message seller" CTA above, so it reads as a specific
              question type rather than duplicating the same button. Delivery
              itself is never handled by Lalooba — this just routes the
              question to the seller through the same messaging system. */}
          <div className="mt-4 rounded-lg border border-navy-100 bg-navy-50/50 p-3">
            <p className="mb-1 text-sm font-bold text-navy-900">🚚 {t("delivery_title")}</p>
            <p className="mb-2 text-xs leading-relaxed text-navy-600">{t("delivery_note")}</p>
            <MessageSellerButton
              sellerId={`00000000-0000-0000-0000-00000000000${listing.id}`}
              listingId={null}
              sellerName={listing.seller.name}
              label={`🚚 ${t("delivery_cta")}`}
              variant="secondary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
