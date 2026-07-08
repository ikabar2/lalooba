"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { JeebLiOffer } from "./types";

export default function JeebLiOfferCard({ offer }: { offer: JeebLiOffer }) {
  const { t, lang } = useLanguage();

  const formattedDate = new Date(offer.departureDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/jeebli/request/${offer.id}`}
      className="group block rounded-xl border border-navy-100 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-navy-200 hover:shadow-lg hover:shadow-navy-900/8"
    >
      {/* Role badge — always visible, never ambiguous which side of Jeeb Li this card represents */}
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-teal-600">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 16.5v1a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 0H5.5a2 2 0 012 1.72c.13.81.34 1.6.63 2.36a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006 6l1.72-1.27a2 2 0 012.11-.45c.76.29 1.55.5 2.36.63A2 2 0 0122 16.5z" />
          </svg>
          {t("jeebli_traveler")}
        </span>

        {offer.traveler.verified && (
          <span className="flex items-center gap-1 text-xs font-semibold text-teal-600">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            Verified
          </span>
        )}
      </div>

      {/* Route */}
      <div className="mb-1 flex items-center gap-2 text-base font-bold text-navy-900">
        <span>{offer.originCity[lang]}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-navy-400">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
        <span>{offer.destinationCity[lang]}</span>
      </div>
      <p className="mb-3 text-xs text-navy-500">
        {offer.originCountry[lang]} → {offer.destinationCountry[lang]} · {formattedDate}
      </p>

      {/* Traveler info */}
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-50 text-[11px] font-bold text-navy-900">
          {offer.traveler.avatarInitials}
        </span>
        <span className="text-sm font-medium text-navy-700">{offer.traveler.name}</span>
      </div>

      {/* Weight + price — the two numbers that matter most, color-coded and
          large so they're scannable without reading the rest of the card */}
      <div className="flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-500">
            {t("jeebli_available_weight")}
          </p>
          <p className="text-xl font-extrabold tabular-nums text-teal-600">
            {offer.availableWeightKg} <span className="text-sm font-bold">kg</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-500">Price</p>
          <p className="text-xl font-extrabold tabular-nums text-gold-400">
            ${offer.pricePerKg}
            <span className="text-sm font-bold text-navy-500"> /{t("jeebli_price_per_kg")}</span>
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-navy-500">{offer.allowedItems[lang]}</p>

      <span className="mt-3 inline-block text-sm font-bold text-navy-900 group-hover:text-gold-400">
        {t("jeebli_request_space")} →
      </span>
    </Link>
  );
}
