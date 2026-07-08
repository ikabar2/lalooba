// Single source of truth for "what do we call this person in the UI".
// Before this, Header.tsx rendered the signed-in user's raw email address
// directly — not a great look ("karim.demo@lalooba.dev" in the nav bar),
// and every other place that eventually needs a display name (welcome
// messages, account menu, dashboard) would have reinvented this same
// fallback chain slightly differently if left to copy-paste.
//
// Fallback order:
//   1. display_name — the dedicated public marketplace-identity field
//      (profiles.display_name, migration 002). This is the authoritative
//      "what to show other users" value once a profile exists.
//   2. full_name, wherever it lives (legacy profiles.full_name, or
//      user_metadata.full_name straight off the auth session before a
//      profiles row has even been fetched)
//   3. the local part of their email ("karim" from "karim@example.com") —
//      still shows *something* personal instead of a blank, without
//      exposing the full address in chrome that's visible at a glance
//   4. a generic fallback so a greeting never renders "Hello, undefined"

type DisplayNameInput =
  | {
      display_name?: string | null;
      full_name?: string | null;
      user_metadata?: { full_name?: string | null; display_name?: string | null } | null;
      email?: string | null;
    }
  | null
  | undefined;

export function getDisplayName(user: DisplayNameInput, fallback = "there"): string {
  if (!user) return fallback;

  const displayName = user.display_name ?? user.user_metadata?.display_name;
  if (displayName && displayName.trim().length > 0) {
    return displayName.trim();
  }

  const fullName = user.full_name ?? user.user_metadata?.full_name;
  if (fullName && fullName.trim().length > 0) {
    return fullName.trim();
  }

  if (user.email) {
    const localPart = user.email.split("@")[0];
    if (localPart) return localPart;
  }

  return fallback;
}
