"use client";

import { useRouter } from "next/navigation";
import ScrollReveal from "./ScrollReveal";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/translations";
import { categoryIcons } from "./Header";

// Same key list/order as the header's category <select>, but rendered as
// tappable icon tiles — the visual "All Categories" entry point Kijiji-style
// marketplaces use above the fold, instead of making people open a dropdown
// to see what's sellable here. Clicking a tile reuses the same
// /marketplace?category= URL contract as the header search bar.
const categoryKeys: TranslationKey[] = [
  "cat_clothing",
  "cat_food",
  "cat_homemade",
  "cat_crafts",
  "cat_electronics",
  "cat_perfumes",
  "cat_cars",
  "cat_barbershop",
  "cat_tax",
  "cat_other",
];

export default function CategoryIconBar() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-6xl px-5 pt-8">
      <h2 className="mb-4 font-display text-lg font-bold text-navy-900">
        {t("browse_categories_title")}
      </h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-9">
        {categoryKeys.map((key, i) => (
          <ScrollReveal key={key} delay={i * 40}>
            <button
              type="button"
              onClick={() => router.push(`/marketplace?category=${key}`)}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-navy-100 bg-white px-2 py-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-gold-200/40 hover:shadow-md hover:shadow-navy-900/8"
            >
              <span
                aria-hidden
                className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-50 text-xl"
              >
                {categoryIcons[key]}
              </span>
              <span className="text-xs font-semibold leading-tight text-navy-800">
                {t(key)}
              </span>
            </button>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
