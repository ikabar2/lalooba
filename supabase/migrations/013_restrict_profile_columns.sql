-- ============================================================================
-- 013 — Restrict sensitive profile columns from public reads
--
-- SECURITY FIX (PII exposure). The profiles SELECT policy is
-- `using (true)` — every row is world-readable, which is intended for the
-- PUBLIC fields (display name, city, bio, verified badges). But RLS is
-- row-level, not column-level, so the same policy also exposed `phone`
-- (personal PII) and `role` (privilege info) to any client using the public
-- anon key — a user could read every member's phone number straight from the
-- API, bypassing the app UI.
--
-- Postgres can't express "hide these columns" in an RLS policy, so we use
-- COLUMN-LEVEL privileges: revoke SELECT on the sensitive columns from the
-- anon/authenticated roles, then re-grant SELECT on exactly the safe columns.
-- The owner still sees their own full row through the security-definer paths
-- that need it (e.g. the account page reads its own phone via auth context /
-- functions), and RLS continues to govern which ROWS are visible.
--
-- Net effect: listing/seller/conversation joins that select safe columns keep
-- working unchanged; a raw `select phone from profiles` by a client is denied.
-- ============================================================================

-- Revoke blanket column SELECT, then grant back only the public-safe columns.
revoke select on profiles from anon, authenticated;

grant select (
  id,
  full_name,
  display_name,
  phone_verified,
  id_verified,
  city_en,
  city_ar,
  country,
  bio_en,
  bio_ar,
  avatar_url,
  created_at
) on profiles to anon, authenticated;

-- Note: `phone` and `role` are intentionally omitted above, so they are no
-- longer selectable by anon/authenticated. Server-side code that legitimately
-- needs them runs with elevated context (SECURITY DEFINER functions) or the
-- service role, neither of which is affected by these grants.

-- Keep INSERT/UPDATE working for the owner (RLS still restricts to their row).
grant insert, update on profiles to authenticated;
