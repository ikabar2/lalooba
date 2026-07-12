import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // Note: NEXT_PUBLIC_* variables are inlined into the BROWSER bundle at BUILD
  // time. If they're only added to the host AFTER a build (or the build cache
  // is stale), the server can have them while the browser bundle ships an
  // empty value — which makes requests reach Supabase with no `apikey` header
  // and fail with a 500 "No API key found in request". So we validate for
  // empty/whitespace too, not just undefined, and fail with a clear message.
  if (!url || !key) {
    throw new Error(
      "Supabase browser client is misconfigured: NEXT_PUBLIC_SUPABASE_URL / " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY are missing from the client bundle. " +
        "Set them in your host's Environment Variables and REDEPLOY (a fresh " +
        "build is required — these are inlined at build time, not runtime)."
    );
  }

  return createBrowserClient(url, key);
}
