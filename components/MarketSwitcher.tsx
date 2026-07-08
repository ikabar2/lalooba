"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/translations";

// Top-of-marketplace Canada / US switcher. State lives in the URL
// (?market=CA|US), not component state — same architecture as the category
// filter, which means it's shareable, bookmarkable, survives Back/Forward,
// and the server component reads it directly to filter listings. "All
// markets" clears the param so a visitor can browse both countries at once
// (the explicit "allow users to browse both markets" requirement).
//
// Reusable and pathname-aware: it preserves any existing query params
// (q, category) when switching markets, and works on any route that reads
// ?market= (marketplace grid today, could be reused on /jeebli later).

const MARKETS: { value: "" | "CA" | "US"; labelKey: TranslationKey }[] = [
  { value: "", labelKey: "market_all" },
  { value: "CA", labelKey: "market_canada" },
  { value: "US", labelKey: "market_usa" },
];

export default function MarketSwitcher({ current }: { current: "CA" | "US" | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  function selectMarket(value: "" | "CA" | "US") {
    // Clone the current params so category/search survive the market change.
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("market", value);
    else params.delete("market");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const activeValue = current ?? "";

  return (
    <div
      role="group"
      aria-label={t("market_switcher_label")}
      className="inline-flex items-center gap-1 rounded-full border border-navy-100 bg-navy-50/60 p-1"
    >
      {MARKETS.map((m) => {
        const active = m.value === activeValue;
        return (
          <button
            key={m.value || "all"}
            type="button"
            onClick={() => selectMarket(m.value)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              active
                ? "bg-navy-900 text-white shadow-sm"
                : "text-navy-700 hover:bg-white"
            }`}
          >
            {t(m.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
