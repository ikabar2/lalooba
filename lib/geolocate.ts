"use client";

// On-demand precise geolocation. This module NEVER prompts on page load —
// the permission popup only appears when the user explicitly asks for
// precise location (requestPreciseLocation from a click), or not at all if
// permission was already granted before (refreshIfAlreadyGranted, which is
// promptless by definition).
//
// Location precedence stays: saved preference > GPS > IP (middleware).

type Country = "CA" | "US";
export type GeoResult = { country: Country | null; city: string | null };

function writeCookie(name: string, value: string, days: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${
    days * 86400
  }; SameSite=Lax`;
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

async function reverseGeocode(lat: number, lon: number): Promise<GeoResult> {
  // Defensive: coords come from the browser Geolocation API (always numbers),
  // but guard anyway before interpolating into a URL.
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return { country: null, city: null };
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal }
    );
    if (!res.ok) return { country: null, city: null };
    const data = (await res.json()) as {
      address?: {
        country_code?: string;
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
      };
    };
    const cc = data.address?.country_code?.toUpperCase();
    return {
      country: cc === "CA" ? "CA" : cc === "US" ? "US" : null,
      city:
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.municipality ||
        null,
    };
  } finally {
    window.clearTimeout(timer);
  }
}

function persist(result: GeoResult): boolean {
  let changed = false;
  // Never override an explicit country preference with GPS.
  const pref = readCookie("lalooba-country-pref");
  const prefSet = pref === "CA" || pref === "US";
  if (result.country && !prefSet && readCookie("lalooba-country") !== result.country) {
    writeCookie("lalooba-country", result.country, 365);
    changed = true;
  }
  if (result.city && readCookie("lalooba-city") !== result.city) {
    writeCookie("lalooba-city", result.city, 365);
    changed = true;
  }
  if (changed) writeCookie("lalooba-geo-tried", "1", 30);
  return changed;
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 300000,
    });
  });
}

// Explicit user request (call from a click handler). WILL prompt if the
// browser hasn't decided yet — which is fine, because the user just asked.
// Returns whether cookies changed (caller decides whether to refresh).
export async function requestPreciseLocation(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return false;
  try {
    const pos = await getPosition();
    const result = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
    return persist(result);
  } catch {
    return false; // denied / unavailable / timed out — IP fallback stands
  }
}

// Silent startup refinement: ONLY runs GPS if permission is already
// "granted" (previously approved), which the Permissions API lets us check
// without triggering any popup. New users see no prompt whatsoever.
export async function refreshIfAlreadyGranted(): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !navigator.geolocation ||
    !navigator.permissions?.query
  ) {
    return false;
  }
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state !== "granted") return false; // never prompt
    const pos = await getPosition();
    const result = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
    return persist(result);
  } catch {
    return false;
  }
}
