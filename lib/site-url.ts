// Resolve the site's base URL for building auth redirect links (password
// reset, email confirmation).
//
// WHY THIS EXISTS: these links get baked into emails and must point at the
// real, allowlisted domain. Relying on window.location.origin breaks that —
// on localhost it becomes http://localhost:3000, on a Vercel preview it's a
// random *.vercel.app URL, and either will (a) not be in Supabase's redirect
// allowlist and (b) send the user to the wrong place. So we prefer an
// explicitly-configured production URL and only fall back to the current
// origin when none is set.
//
// Set NEXT_PUBLIC_SITE_URL in your environment (e.g. https://lalooba.com).
// It must match a URL you've added to Supabase → Authentication → URL
// Configuration → Redirect URLs.
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && configured.trim() !== "") {
    // Normalize: no trailing slash, so callers can safely append "/path".
    return configured.trim().replace(/\/+$/, "");
  }
  // Fallback for local dev when the env var isn't set.
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  // Last-resort default (server-side with no env var). Update if your
  // production domain changes.
  return "https://lalooba.com";
}
