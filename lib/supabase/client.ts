import { createBrowserClient } from "@supabase/ssr";

// Bare member expressions so Next.js can statically inline the values into the
// browser bundle at build time (do NOT method-chain here — see note below).
const INLINED_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const INLINED_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cache the resolved config so we only ever fetch the runtime fallback once.
let cachedUrl = (INLINED_URL ?? "").trim();
let cachedKey = (INLINED_ANON_KEY ?? "").trim();

/**
 * Synchronous client creation using build-time-inlined env vars. This is the
 * fast path and works whenever NEXT_PUBLIC_* inlining succeeded (the normal
 * case). Throws if the values aren't in the bundle — callers that must be
 * resilient to a failed inline should use `createClientAsync()` instead.
 */
export function createClient() {
  if (!cachedUrl || !cachedKey) {
    throw new Error(
      "Supabase browser client is misconfigured: NEXT_PUBLIC_SUPABASE_URL / " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY are missing from the client bundle."
    );
  }
  return createBrowserClient(cachedUrl, cachedKey);
}

/**
 * Resilient client creation. Uses build-time-inlined values when present;
 * otherwise fetches the public config from the server at runtime (/api/
 * public-config), which ALWAYS has the values because the server reads
 * process.env at runtime. This makes auth work even if build-time inlining
 * of NEXT_PUBLIC_* didn't happen for any reason. Use this on the auth pages.
 */
export async function createClientAsync() {
  if (!cachedUrl || !cachedKey) {
    try {
      const res = await fetch("/api/public-config", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { url?: string; anonKey?: string };
        if (data.url && data.anonKey) {
          cachedUrl = data.url.trim();
          cachedKey = data.anonKey.trim();
        }
      }
    } catch {
      // fall through to the error below
    }
  }

  if (!cachedUrl || !cachedKey) {
    throw new Error(
      "Supabase configuration is unavailable (both the client bundle and the " +
        "runtime config endpoint returned nothing). Check NEXT_PUBLIC_SUPABASE_URL " +
        "and NEXT_PUBLIC_SUPABASE_ANON_KEY in your host environment."
    );
  }
  return createBrowserClient(cachedUrl, cachedKey);
}
