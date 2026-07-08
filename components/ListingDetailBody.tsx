"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { Listing } from "./ListingCard";
import { countryNames } from "@/lib/country-names";
import { bi } from "@/lib/bilingual";
import { currencyForCountry, formatSDG } from "@/lib/currency";
import { getFeaturedIdSet } from "@/lib/featured";
import { createClient } from "@/lib/supabase/client";
import MessageSellerButton from "./MessageSellerButton";
import ImageGallery from "./ImageGallery";
import Breadcrumbs from "./Breadcrumbs";

export default function ListingDetailBody({ listing }: { listing: Listing }) {
  const { lang, t } = useLanguage();
  const isFeatured = getFeaturedIdSet([listing]).has(listing.id);
  const isSold = listing.availability === "sold";

  // Detect whether the current viewer is the seller, so we don't offer a
  // "message yourself" button on your own listing (which the DB rejects via
  // the distinct_participants CHECK anyway). Resolved client-side after
  // mount; defaults to false so nothing flickers for signed-out visitors.
  const [isOwnListing, setIsOwnListing] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (active && data.user && data.user.id === listing.sellerId) {
          setIsOwnListing(true);
        }
      } catch {
        /* Supabase not configured — leave as not-own, button stays visible */
      }
    })();
    return () => {
      active = false;
    };
  }, [listing.sellerId]);

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
          <p className="mb-1 text-xl font-bold text-navy-800">
            {currencyForCountry[listing.country]} {listing.price.toLocaleString("en-US")}
          </p>
          {listing.category === "cat_bank" && listing.sdgAmount != null && (
            <p className="mb-3 text-sm font-semibold text-gold-500">
              → SDG {formatSDG(listing.sdgAmount)}
            </p>
          )}
          {listing.category === "cat_homemade" && (
            <div className="mb-3 flex flex-wrap gap-2">
              {listing.quantity != null && (
                <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700">
                  {listing.quantity} {listing.quantity === 1 ? "portion" : "portions"} available
                </span>
              )}
              {listing.fulfillment && (
                <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700">
                  {listing.fulfillment === "both"
                    ? "Pickup or delivery"
                    : listing.fulfillment === "delivery"
                      ? "Delivery"
                      : "Pickup"}
                </span>
              )}
            </div>
          )}
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

          {isOwnListing ? (
            <div className="rounded-lg border border-navy-100 bg-navy-50/50 px-4 py-3 text-sm text-navy-600">
              {t("own_listing_note")}
            </div>
          ) : (
            <MessageSellerButton
              sellerId={listing.sellerId}
              listingId={isRealListing ? listing.id : null}
              sellerName={listing.seller.name}
            />
          )}

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
