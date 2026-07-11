"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { requestPreciseLocation } from "@/lib/geolocate";

// Header location chip. Shows the current city (from IP or a prior GPS fix)
// and, on tap, lets the user EXPLICITLY opt into precise location. The
// permission popup only ever appears as a result of this click — never on
// page load — so new users aren't ambushed by it.
export default function LocationChip({ detectedCity }: { detectedCity: string | null }) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const changed = await requestPreciseLocation();
      if (changed) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const label = detectedCity ?? t("location_fallback");

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title={lang === "ar" ? "استخدم موقعي الدقيق" : "Use my precise location"}
      aria-label={lang === "ar" ? "استخدم موقعي الدقيق" : "Use my precise location"}
      className="flex flex-1 items-center gap-1.5 rounded-lg border border-navy-100 bg-white px-3 py-3 text-sm text-navy-700 transition hover:border-navy-200 hover:bg-navy-50 disabled:opacity-60 sm:flex-none sm:py-2"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={`shrink-0 ${busy ? "animate-pulse" : ""}`}
      >
        <path d="M12 21s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
      <span className="truncate">{busy ? (lang === "ar" ? "جارٍ التحديد…" : "Locating…") : label}</span>
    </button>
  );
}
