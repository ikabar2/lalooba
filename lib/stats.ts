import { createClient } from "@/lib/supabase/server";

// Baseline shown when Supabase isn't configured yet (no .env.local locally)
// or the query fails for any reason — keeps the banner from ever rendering
// "undefined" or crashing the homepage. This is the ONLY number you'd ever
// hand-edit here. Once real Supabase credentials are set, getActiveMemberCount
// returns the live, exact row count from `profiles` instead — every signup
// increments it automatically via the existing on-signup trigger
// (000_profiles_and_signup_trigger.sql), no manual bookkeeping, no risk of
// the displayed number drifting from reality the way a hardcoded string does.
const FALLBACK_ACTIVE_MEMBERS = 1200;

export async function getActiveMemberCount(): Promise<{ count: number; isLive: boolean }> {
  try {
    const supabase = await createClient();
    // head: true — asks Postgres for the count only, no rows returned.
    // profiles has an open "Users can view all profiles" select policy
    // (000_profiles_and_signup_trigger.sql), so this works with just the
    // anon key, same as any other public homepage read.
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (error || count === null) {
      return { count: FALLBACK_ACTIVE_MEMBERS, isLive: false };
    }
    return { count, isLive: true };
  } catch {
    // createClient() throws if NEXT_PUBLIC_SUPABASE_URL/ANON_KEY aren't set
    // yet — the expected state for local dev before .env.local is filled
    // in, not an error worth logging.
    return { count: FALLBACK_ACTIVE_MEMBERS, isLive: false };
  }
}
