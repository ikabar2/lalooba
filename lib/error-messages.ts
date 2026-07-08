// Translates raw Supabase/Postgres/Storage error strings into something a
// visitor can actually act on. Before this, error.message from Supabase
// was shown to the user verbatim in a couple of places — e.g. a failed
// photo upload rendered the literal string "Bucket not found" in the UI,
// which means nothing to someone trying to post a listing and just looks
// like the site is broken. This never hides the real error from
// developers — callers should still console.error(error) alongside
// showing this, so the actual cause is still visible in the browser
// console / server logs, just not in the user-facing UI.
//
// Matching is deliberately loose (substring, case-insensitive) since
// Supabase doesn't guarantee stable machine-readable error codes across
// every failure mode here — the alternative (showing the raw message) is
// worse than an occasional imperfect match.
export function friendlyErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const lower = raw.toLowerCase();

  if (lower.includes("bucket not found")) {
    // This specific one means a setup problem, not a user mistake — the
    // storage bucket migration hasn't been run against this Supabase
    // project yet. A visitor can't fix that, so don't imply retrying will
    // help; a site owner reading this in a bug report should recognize it
    // immediately from the wording.
    return "Photo uploads aren't set up yet on this site. Please try again later or contact support.";
  }
  if (lower.includes("payload too large") || lower.includes("exceeded the maximum allowed size")) {
    return "That photo is too large. Please use an image under 5 MB.";
  }
  if (lower.includes("mime type") || lower.includes("not allowed") || lower.includes("content-type")) {
    return "That file type isn't supported. Please upload a JPG, PNG, WEBP, or AVIF image.";
  }
  if (lower.includes("duplicate key") || lower.includes("already exists")) {
    return "That already exists — please try a different value.";
  }
  if (lower.includes("row-level security") || lower.includes("permission denied") || lower.includes("rls")) {
    return "You don't have permission to do that. Try signing in again.";
  }
  if (lower.includes("jwt") || lower.includes("not authenticated") || lower.includes("invalid session")) {
    return "Your session has expired. Please sign in again.";
  }
  if (lower.includes("network") || lower.includes("fetch failed") || lower.includes("failed to fetch")) {
    return "Connection problem. Please check your internet and try again.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many attempts — please wait a moment and try again.";
  }

  return fallback;
}
