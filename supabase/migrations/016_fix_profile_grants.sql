-- ============================================================================
-- 016 — Fix profile column grants: first_name / last_name were omitted
--
-- BUG FIX. Migrations 013/014 replaced blanket SELECT on profiles with a
-- column allowlist, but the list missed first_name and last_name (added in
-- 002). The account page selects those columns, so its profile load started
-- failing with "permission denied for table profiles" after 013/014 ran.
--
-- These are user-entered display names — public-safe by design (they feed
-- display_name) — so they belong in the allowlist. phone and role remain
-- excluded (owner/admin access goes through my_phone() / admin_get_contact()
-- from migration 014).
--
-- Idempotent: full revoke + re-grant of the complete correct list.
-- ============================================================================

revoke select on profiles from anon, authenticated;

grant select (
  id,
  first_name,
  last_name,
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

grant insert, update on profiles to authenticated;
