"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/translations";
import { countryNames } from "@/lib/country-names";
import { bi } from "@/lib/bilingual";
import { formatSDG } from "@/lib/currency";
import { categoryIcons } from "./Header";

export type Listing = {
  id: string;
  title: { en: string; ar: string };
  price: number;
  city: { en: string; ar: string };
  country: "CA" | "US";
  images: string[]; // first image is the cover/display photo
  category: TranslationKey; // one of the cat_* keys from translations.ts
  // For bank-transfer (cat_bank) listings: the SDG amount the seller gives
  // for the posted local price. Seller-entered, not auto-converted.
  sdgAmount?: number | null;
  // For Homemade Cook (cat_homemade) listings: portions available and how
  // the buyer receives it. Null for other categories.
  quantity?: number | null;
  fulfillment?: "pickup" | "delivery" | "both" | null;
  sellerId: string; // links to a Seller profile
  seller: {
    name: string;
    avatarInitials: string;
    verified: boolean;
  };
  // Mirrors supabase/migrations/009_listing_availability_status.sql —
  // seller-controlled sale state, independent of moderation status.
  availability: "available" | "sold" | "inactive";
  // Mirrors supabase/migrations/010_featured_listings.sql. createdAt is an
  // ISO timestamp so lib/featured.ts can rank exactly the way the
  // `featured_listings` SQL view does. featuredUntil/featuredPriority are
  // optional because older or non-featured rows may not have them set.
  createdAt: string;
  featuredUntil?: string | null;
  featuredSource?: "auto" | "paid";
  featuredPriority?: number;
};

// CAD vs USD is genuinely ambiguous on a cross-border marketplace — "$45"
// means two different things depending which side of the border it's on.
// Spelling it out next to every price is a small line of code that removes
// a real trust question ("wait, is that my dollars?") before it ever gets
// asked.
const currencyCode: Record<Listing["country"], string> = { CA: "CAD", US: "USD" };

export default function ListingCard({
  listing,
  featured = false,
}: {
  listing: Listing;
  featured?: boolean;
}) {
  const { lang, t } = useLanguage();
  // listing.images can legitimately be empty — the post form requires at
  // least one photo client-side, but that's not enforced by the database
  // (no CHECK constraint on array length), so a row inserted any other way
  // (direct API call, future admin tool) could have zero. next/image
  // throws a hard runtime error when given an undefined src — this
  // fallback avoids the crash entirely rather than relying on the error
  // boundary to catch it after the fact.
  const coverImage = listing.images[0] ?? "/images/placeholder.jpg";
  const isSold = listing.availability === "sold";


  return (
    <Link
      href={`/listing/${listing.id}`}
      className={`group block overflow-hidden rounded-xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-navy-900/10 ${
        featured
          ? "border-gold-200/60 ring-1 ring-gold-200/40 hover:border-gold-200"
          : "border-navy-100 hover:border-gold-200/40"
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-navy-50">
        <Image
          src={coverImage}
          alt={listing.title[lang]}
          fill
          loading="lazy"
          // Tells the browser exactly how big this image will render at each
          // breakpoint, so it downloads the right size instead of always
          // fetching the largest one — this is what actually saves mobile
          // data, not just lazy loading on its own.
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={`object-cover transition-transform duration-500 ease-out group-hover:scale-110 ${
            isSold ? "grayscale" : ""
          }`}
        />

        {/* Sold state: a corner ribbon rather than a full dark overlay with
            centered stamp. The old version blocked the whole photo — which
            actively fights the point of a sold listing staying visible at
            all (it's there as a trust signal / seller history, so the
            photo should still read clearly). A ribbon is unmistakable
            without hiding the item. */}
        {isSold && (
          <div className="pointer-events-none absolute left-[-34px] top-[14px] w-[130px] -rotate-45 bg-navy-900 py-1 text-center text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
            {t("sold_badge")}
          </div>
        )}

        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          {featured && !isSold && (
            <span className="rounded-full bg-gold-200 px-2 py-0.5 text-[11px] font-extrabold text-white shadow-sm">
              {t("featured_badge")}
            </span>
          )}
          {listing.images.length > 1 && (
            <span className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="14" height="14" rx="2" />
                <path d="M7 21h14v-14" />
              </svg>
              {listing.images.length}
            </span>
          )}
        </div>

        {/* Category icon replaces what used to be a full name+avatar pill
            sitting on top of the photo. That pill did two jobs at once
            (identify category-ish context AND seller identity) and did
            both poorly — it covered a meaningful chunk of every single
            product photo in the grid, repeated dozens of times per page,
            for information that's secondary to "what is this item". Seller
            identity now lives below the fold of the image, where it earns
            its own line instead of fighting the photo for attention. */}
        <span
          aria-hidden
          className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[13px] shadow-sm backdrop-blur-sm"
          title={t(listing.category)}
        >
          {categoryIcons[listing.category]}
        </span>
      </div>

      {/* Price leads — on a browse grid people scan "how much" before
          "what is it" (same principle the Jeeb Li cards already use for
          weight/price). Title moves to a supporting line underneath,
          allowed two lines instead of a hard truncate since price no
          longer needs to share a line with it. */}
      <div className="p-3">
        <p className="mb-0.5 flex items-baseline gap-1">
          <span className="text-lg font-extrabold tabular-nums text-navy-900">${listing.price}</span>
          <span className="text-[11px] font-bold text-navy-500">{currencyCode[listing.country]}</span>
        </p>
        {listing.category === "cat_bank" && listing.sdgAmount != null && (
          <p className="mb-1 text-[11px] font-semibold text-gold-500">→ SDG {formatSDG(listing.sdgAmount)}</p>
        )}
        <p className="mb-1.5 line-clamp-2 text-sm font-medium leading-snug text-navy-800">
          {listing.title[lang]}
        </p>

        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-navy-600">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-navy-50 text-[9px] font-bold text-navy-900">
              {listing.seller.avatarInitials}
            </span>
            <span className="truncate">{listing.seller.name}</span>
            {listing.seller.verified && (
              <svg
                aria-label="Verified seller"
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="shrink-0 text-teal-600"
              >
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
          </span>
        </div>

        <p className="mt-1 flex items-center gap-1 text-xs text-navy-500">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 21s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          {listing.city[lang]}, {bi(countryNames[listing.country], lang)}
        </p>
      </div>
    </Link>
  );
}
