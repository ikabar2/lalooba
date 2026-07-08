import type { SupabaseClient } from "@supabase/supabase-js";

// The reusable fix for the "violates foreign key constraint ..._traveler_id_fkey"
// (and the identical class of error on listings, requests, reviews, etc.):
// every one of those tables' user FKs points at profiles(id), so a post
// fails if the current user has no profiles row. Rather than each posting
// path discovering this the hard way, they all call ensureProfile() first.
//
// It's a no-op for the overwhelming common case (profile already exists —
// one cheap indexed lookup), and self-heals the rare case (profile missing)
// by inserting one via the "Users can create their own profile" RLS policy
// added in migration 002. The insert is upsert-style (ignoreDuplicates) so
// a race between this and the signup trigger can't throw.
//
// Works with either the browser or server Supabase client — both satisfy
// the SupabaseClient shape — so a Client Component form and a Server Action
// can share the exact same guarantee.
export async function ensureProfile(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null; user_metadata?: { full_name?: string | null } | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data: existing, error: selectError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (selectError) {
      return { ok: false, error: selectError.message };
    }
    if (existing) {
      return { ok: true }; // common path — nothing to do
    }

    // No profile row — create the minimum viable one. display_name falls
    // back through metadata name → email local part → generic, matching
    // the trigger and the SQL backfill so the value is consistent no matter
    // which path created the row.
    const fallbackName =
      user.user_metadata?.full_name?.trim() ||
      user.email?.split("@")[0] ||
      "Member";

    const { error: insertError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: fallbackName }, { onConflict: "id", ignoreDuplicates: true });

    if (insertError) {
      return { ok: false, error: insertError.message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error ensuring profile" };
  }
}
