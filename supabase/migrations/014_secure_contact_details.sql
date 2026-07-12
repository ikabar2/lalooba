-- ============================================================================
-- 014 — Lock phone (and email access) to owner + admin only
--
-- GOAL: a user's phone must be readable ONLY by that user and by admins —
-- never by other members or anonymous visitors. Email is not stored in
-- profiles at all (it lives in auth.users, which is already private to the
-- owner + service role), so this migration focuses on phone plus a safe,
-- admin-only way to read both.
--
-- Migration 013 already removed `phone` from the columns anon/authenticated
-- can SELECT, so other users can no longer read it via the table. This
-- migration adds back the two LEGITIMATE read paths:
--   1. The OWNER reading their own phone (for the account page).
--   2. An ADMIN reading any user's phone + email (for moderation/support).
-- Both go through SECURITY DEFINER functions with explicit checks, so the
-- base-table grant stays locked down.
-- ============================================================================

-- Helper: is the current user an admin? (role stored on profiles.role)
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- 1. Owner reads their OWN phone. Returns null for anyone else.
create or replace function my_phone()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select phone from profiles where id = auth.uid();
$$;

-- 2. Admin reads any user's contact details (phone from profiles, email from
--    auth.users). Non-admins get nothing — the function returns no rows.
create or replace function admin_get_contact(target_id uuid)
returns table (id uuid, phone text, email text)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not is_admin() then
    return; -- not an admin → empty result, no leak
  end if;
  return query
  select p.id, p.phone, u.email::text
  from profiles p
  join auth.users u on u.id = p.id
  where p.id = target_id;
end;
$$;

grant execute on function is_admin() to authenticated;
grant execute on function my_phone() to authenticated;
grant execute on function admin_get_contact(uuid) to authenticated;

-- Belt-and-suspenders: make sure phone/role are NOT in the public column
-- grant (repeat of 013 so this migration is self-contained and idempotent).
revoke select on profiles from anon, authenticated;
grant select (
  id, full_name, display_name, phone_verified, id_verified,
  city_en, city_ar, country, bio_en, bio_ar, avatar_url, created_at
) on profiles to anon, authenticated;
grant insert, update on profiles to authenticated;
