"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/translations";

// verified sellers / positive reviews stay placeholder until those are
// backed by real aggregate queries too (verified sellers = a count on
// profiles.id_verified, reviews % once the reviews table from the seller
// profile work exists for real) — update the values here when that
// happens. Active members is no longer in this list: it's wired to a live
// count from the database (see lib/stats.ts and the activeMembers prop
// below), not a hardcoded string, so it can't silently drift from reality.
const secondaryStats: { value: string; labelKey: TranslationKey }[] = [
  { value: "340+", labelKey: "stat_verified_sellers" },
  { value: "98%", labelKey: "stat_positive_reviews" },
];

export default function PromoBanner({
  activeMembers,
  activeMembersIsLive,
}: {
  activeMembers: number;
  activeMembersIsLive: boolean;
}) {
  const { t } = useLanguage();
  // Live count is exact, so show it plainly. The fallback baseline (used
  // only when Supabase isn't configured yet) gets a "+" so it reads as an
  // approximation rather than a suspiciously precise number that isn't real.
  const activeMembersLabel = activeMembersIsLive
    ? activeMembers.toLocaleString()
    : `${activeMembers.toLocaleString()}+`;

  return (
    <section className="relative overflow-hidden bg-navy-900">
      <svg
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 opacity-10"
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <circle cx="32" cy="14" r="6" fill="#FF4500" />
        <circle cx="52" cy="32" r="6" fill="#FF4500" />
        <circle cx="32" cy="50" r="6" fill="#FF4500" />
        <circle cx="12" cy="32" r="6" fill="#FF4500" />
        <circle cx="32" cy="32" r="8" fill="none" stroke="#FF4500" strokeWidth="4" />
      </svg>

      <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-5 py-7 sm:gap-10">
        <div className="min-w-[240px] flex-1">
          <p className="font-display text-xl font-medium text-white sm:text-2xl">
            {t("hero_badge")}
          </p>
          <p className="mb-4 text-sm text-navy-200">{t("free_browse_note")}</p>

          {/* Two modules live on this homepage (marketplace + Jeeb Li) —
              saying so in plain chips right in the banner, before anyone
              scrolls, is what actually prevents "wait, is this just a
              travel-delivery app?" confusion — a section eyebrow further
              down the page only helps once someone's already scrolled
              past the point of confusion. */}
          <div className="mb-5 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              🛍 {t("nav_marketplace")}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              ✈️ {t("nav_jeebli")}
            </span>
          </div>

          {/* Real CTAs — the banner previously ended at a tagline with no
              action to take. A hero section that states value but gives no
              next step makes the visitor do the work of finding the
              signup/browse entry points themselves. */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-gold-200 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-gold-400"
            >
              {t("cta_primary")}
            </Link>
            <Link
              href="/marketplace"
              className="rounded-lg border border-white/25 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              {t("cta_secondary")}
            </Link>
          </div>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap items-center gap-6 sm:gap-10">
          <div className="text-center sm:text-left">
            <p className="font-display text-2xl font-medium text-white sm:text-3xl">
              {activeMembersLabel}
            </p>
            <p className="text-xs text-navy-200">{t("stat_active_members")}</p>
          </div>
          {secondaryStats.map((stat) => (
            <div key={stat.labelKey} className="text-center sm:text-left">
              <p className="font-display text-2xl font-medium text-white sm:text-3xl">
                {stat.value}
              </p>
              <p className="text-xs text-navy-200">{t(stat.labelKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
