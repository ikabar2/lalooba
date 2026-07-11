"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";

// Persistent Canada | USA selector shown in the site header. Unlike the
// marketplace's URL-based MarketSwitcher (which sets a per-view ?market=
// filter), this sets the user's DURABLE country preference:
//   • writes a long-lived `lalooba-country-pref` cookie (1 year)
//   • that preference wins over IP/GPS detection on every future visit
//   • also updates the working `lalooba-country` cookie the feed sorts by
//   • refreshes the current route so listings re-sort immediately
//
// Precedence for what country the feed prioritizes:
//   saved preference  >  GPS/browser geolocation  >  IP geolocation
// This component owns the top of that chain.

type Country = "CA" | "US";

const COUNTRIES: { value: Country; label: string; flag: string }[] = [
  { value: "CA", label: "Canada", flag: "🇨🇦" },
  { value: "US", label: "USA", flag: "🇺🇸" },
];

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days: number) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export default function CountrySelector() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [selected, setSelected] = useState<Country | null>(null);

  // On mount, reflect the current effective country: saved preference first,
  // then whatever detection wrote to the working cookie.
  useEffect(() => {
    const pref = readCookie("lalooba-country-pref");
    const working = readCookie("lalooba-country");
    const initial = pref === "CA" || pref === "US" ? pref : working === "CA" || working === "US" ? working : null;
    setSelected(initial as Country | null);
  }, []);

  function choose(country: Country) {
    if (country === selected) return;
    setSelected(country);
    // Durable preference (1 year) — this is what wins on future visits.
    writeCookie("lalooba-country-pref", country, 365);
    // Working cookie the feed sorts by — update now so the re-sort is instant.
    writeCookie("lalooba-country", country, 365);
    // Re-render server components so the feed re-orders with the new country.
    router.refresh();
  }

  return (
    <div
      className="inline-flex items-center rounded-full border border-navy-100 bg-white p-0.5 text-xs"
      role="group"
      aria-label={lang === "ar" ? "اختيار الدولة" : "Select country"}
    >
      {COUNTRIES.map((c) => {
        const active = selected === c.value;
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => choose(c.value)}
            aria-pressed={active}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold transition ${
              active ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-navy-50"
            }`}
          >
            <span aria-hidden>{c.flag}</span>
            <span className="hidden sm:inline">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
