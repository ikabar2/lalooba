"use client";

import { useLanguage } from "@/lib/language-context";

export default function LockedBanner() {
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-6xl px-5 pb-7">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-teal-200 bg-teal-50 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-teal-600">
          🔒
        </span>
        <p className="min-w-[200px] flex-1 text-sm text-teal-600">
          <strong className="mb-0.5 block text-sm">{t("locked_title")}</strong>
          {t("locked_desc")}
        </p>
        <button className="shrink-0 rounded-md bg-teal-600 px-4 py-2 text-sm font-bold text-teal-50">
          {t("locked_cta")}
        </button>
      </div>
    </section>
  );
}
