"use client";

import Link from "next/link";
import ScrollReveal from "./ScrollReveal";
import JeebLiOfferCard from "./JeebLiOfferCard";
import type { JeebLiOffer } from "./types";
import { useLanguage } from "@/lib/language-context";

export default function JeebLiSection({ offers }: { offers: JeebLiOffer[] }) {
  const { t } = useLanguage();

  return (
    // Deliberately NOT plain white like the marketplace section above it —
    // a tinted, bordered panel is what actually signals "this is a
    // different kind of thing" at a glance, not just a different heading.
    // Same visual language (icon badge) that the header nav and category
    // icons use, so it still feels like one product, just a distinct module.
    <section id="jeebli" className="border-y border-gold-200/25 bg-gold-50/40">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <ScrollReveal>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-extrabold tracking-wide text-gold-400">
                {t("jeebli_eyebrow")}
              </p>
              <h2 className="font-display text-2xl font-medium text-navy-900">
                {t("jeebli_heading")}
              </h2>
              <p className="max-w-xl text-sm text-navy-600">{t("jeebli_sub")}</p>
              <p className="mt-1 max-w-xl text-xs italic text-navy-500">{t("jeebli_banner_note")}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/jeebli/post-trip"
                className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-800"
              >
                ✈ {t("jeebli_post_trip")}
              </Link>
              <Link
                href="/jeebli"
                className="rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-navy-50"
              >
                {t("jeebli_see_all")}
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {offers.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {offers.map((offer, i) => (
              <ScrollReveal key={offer.id} delay={i * 70}>
                <JeebLiOfferCard offer={offer} />
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
