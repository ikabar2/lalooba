"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Browser Geolocation (GPS/Wi-Fi) as the PRIMARY, most-accurate location
// source, with IP geolocation (set by middleware) as the fallback.
//
// How it fits the precedence chain:
//   saved preference (lalooba-country-pref)  >  GPS (this)  >  IP (middleware)
//
// Behaviour:
//   • If the user has already set an explicit country preference, we do
//     NOTHING — their choice is authoritative and we never override it or
//     re-prompt.
//   • Otherwise, once per browser we ask for geolocation permission. If
//     granted, we reverse-geocode the coordinates to a country (CA/US) and a
//     city, write them to the working cookies, and refresh so the feed
//     re-sorts accurately (this is what fixes "Toronto user shown Edmonton":
//     GPS lat/lng resolves the real city, not the ISP's registered one).
//   • If permission is denied or unavailable, we leave the IP-based cookies
//     from middleware untouched — graceful fallback, no error shown.
//
// Renders nothing; it's a side-effect-only component mounted in the layout.

type Country = "CA" | "US";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, days: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${
    days * 86400
  }; SameSite=Lax`;
}

export default function GeolocationDetector() {
  const router = useRouter();

  useEffect(() => {
    // 1. Respect an explicit saved preference — never override the user.
    const pref = readCookie("lalooba-country-pref");
    if (pref === "CA" || pref === "US") return;

    // 2. Only attempt geolocation once per browser, so we don't re-prompt on
    //    every page load. A marker cookie records that we've tried.
    if (readCookie("lalooba-geo-tried") === "1") return;

    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // Mark attempted regardless of outcome below.
        writeCookie("lalooba-geo-tried", "1", 30);
        if (cancelled) return;

        const { latitude, longitude } = position.coords;
        try {
          // Reverse-geocode via OpenStreetMap Nominatim (keyless). Usage is
          // policy-compliant at scale because each BROWSER makes at most one
          // request per 30 days (gated by the lalooba-geo-tried cookie), so
          // load is distributed across user IPs rather than hammering from
          // one server. If traffic grows to the point of needing SLAs,
          // swap this URL for a paid geocoder (Google/Mapbox/LocationIQ) —
          // the response handling below stays the same shape.
          const controller = new AbortController();
          const timer = window.setTimeout(() => controller.abort(), 6000);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            {
              headers: { Accept: "application/json" },
              cache: "no-store",
              signal: controller.signal,
            }
          );
          window.clearTimeout(timer);
          if (!res.ok) return;
          const data = (await res.json()) as {
            address?: {
              country_code?: string;
              city?: string;
              town?: string;
              village?: string;
              municipality?: string;
              state?: string;
            };
          };

          const cc = data.address?.country_code?.toUpperCase();
          const country: Country | null = cc === "CA" ? "CA" : cc === "US" ? "US" : null;
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.municipality ||
            null;

          if (cancelled) return;

          let changed = false;
          if (country && readCookie("lalooba-country") !== country) {
            writeCookie("lalooba-country", country, 365);
            changed = true;
          }
          if (city && readCookie("lalooba-city") !== city) {
            writeCookie("lalooba-city", city, 365);
            changed = true;
          }
          // Only refresh if GPS actually improved on what IP had set.
          if (changed) router.refresh();
        } catch {
          // Reverse-geocode failed — keep IP-based values silently.
        }
      },
      () => {
        // Permission denied or position unavailable → fall back to IP.
        writeCookie("lalooba-geo-tried", "1", 30);
      },
      // Reasonable accuracy without draining battery; cached fix up to 5 min.
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
