import { createBrowserClient } from "@supabase/ssr";

// Bare member expressions so Next.js can statically inline the values into the
// browser bundle at build time (do NOT method-chain here).
const INLINED_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const INLINED_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Module-level cache of the resolved config. Seeded from the build-time
// inlined values; if those are missing (inlining didn't happen for this
// deployment), primeSupabaseConfig() below fills them at runtime from
// /api/public-config, which the SERVER can always provide.
let cachedUrl = (INLINED_URL ?? "").trim();
let cachedKey = (INLINED_ANON_KEY ?? "").trim();

type Client = ReturnType<typeof createBrowserClient>;
// Public non-null client type for callers that annotate locals/params after a
// null-guard (createClient() returns Client | null).
export type SupabaseBrowserClient = Client;
let client: Client | null = null;

function build(): Client | null {
  if (!cachedUrl || !cachedKey) return null;
  if (!client) client = createBrowserClient(cachedUrl, cachedKey);
  return client;
}

/**
 * Synchronous client accessor. Returns null (never throws) when config isn't
 * available yet, so a missing/late-inlined key can NEVER crash the page — the
 * previous throwing behavior propagated to the global error boundary and
 * white-screened the whole app. Callers already guard their Supabase calls in
 * try/catch or optional-chaining; returning null lets them degrade quietly and
 * retry once config is primed.
 */
export function createClient(): Client | null {
  return build();
}

// Track the one-time runtime prime so we don't fetch repeatedly.
let primePromise: Promise<void> | null = null;

/**
 * Ensure the module cache has config. If build-time inlining already provided
 * it, this resolves immediately. Otherwise it fetches the public config from
 * the server ONCE at runtime and seeds the cache, after which createClient()
 * starts returning a real client. Safe to call many times.
 */
export function primeSupabaseConfig(): Promise<void> {
  if (cachedUrl && cachedKey) return Promise.resolve();
  if (primePromise) return primePromise;
  primePromise = (async () => {
    try {
      const res = await fetch("/api/public-config", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { url?: string; anonKey?: string };
        if (data.url && data.anonKey) {
          cachedUrl = data.url.trim();
          cachedKey = data.anonKey.trim();
          client = null; // rebuild with the new config on next createClient()
        }
      }
    } catch {
      // leave unconfigured; callers keep degrading gracefully
    }
  })();
  return primePromise;
}

/**
 * Resilient async client: primes config if needed, then returns a client.
 * Returns null only if config is truly unavailable from both the bundle and
 * the runtime endpoint. Used by the auth pages.
 */
export async function createClientAsync(): Promise<Client | null> {
  await primeSupabaseConfig();
  return build();
}
