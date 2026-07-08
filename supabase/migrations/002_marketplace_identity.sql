-- ============================================================================
-- 002 — Marketplace identity + self-healing profiles
--
-- Two things this migration fixes, both rooted in the same architectural
-- gap: auth identity (auth.users — email, password, the login) was never
-- cleanly separated from marketplace identity (who you are *to other
-- users* — your display name, avatar, location).
--
-- (A) Identity fields. `full_name` alone can't express "show me as
--     'Karim M.' publicly but let me set my real first/last name
--     privately." Splitting these is what lets the app stop ever showing
--     an email as a display name.
--
-- (B) THE POSTING BUG. "insert or update on jeeb_li_offers violates
--     foreign key constraint jeeb_li_offers_traveler_id_fkey" happens
--     because traveler_id references profiles(id), NOT auth.users(id) —
--     and the posting user has no profiles row. That row is normally
--     created by the on_auth_user_created trigger (000_initial_schema.sql),
--     but any user created BEFORE that trigger existed, or via a path that
--     bypassed it (dashboard, admin API, an early signup), never got one.
--     Re-running the trigger only helps NEW users. The real fix is to make
--     profile existence self-healing: give profiles an INSERT policy so a
--     user can create their own row, add an idempotent backfill for every
--     existing auth user missing one, and harden the trigger.
-- ============================================================================

-- --- (A) Marketplace identity fields ----------------------------------------
-- first_name/last_name are the private, real-name fields (account settings).
-- display_name is the public marketplace identity shown everywhere else —
-- separate on purpose, so someone can go by "Karim M." publicly while their
-- account holds "Karim Mostafa". avatar_url may already exist from the
-- earlier avatars-bucket migration on some deployments — guarded with
-- IF NOT EXISTS so this is safe either way.
alter table profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists display_name text,
  add column if not exists avatar_url text;

comment on column profiles.display_name is
  'Public marketplace identity — shown across the app (header, cards, seller profile). Distinct from first_name/last_name (private, account-settings only) and from auth email (never shown as a name). getDisplayName() in lib/user-display.ts resolves the fallback chain.';

-- Backfill display_name from the best available existing value so no
-- current user is left blank: their old full_name, else the email local
-- part, else a generic label. Runs once; the coalesce chain means re-running
-- is harmless.
update profiles p
set display_name = coalesce(
  nullif(trim(p.display_name), ''),
  nullif(trim(p.full_name), ''),
  nullif(split_part((select email from auth.users u where u.id = p.id), '@', 1), ''),
  'Member'
)
where p.display_name is null or trim(p.display_name) = '';

-- --- (B1) profiles INSERT policy (self-healing) -----------------------------
-- profiles had SELECT + UPDATE policies but NO insert policy, so a client
-- could never create a missing profile row for itself — it could only wait
-- for a trigger that may never have fired. This lets an authenticated user
-- create exactly their own profile row (id must equal auth.uid()), which is
-- what ensureProfile() in the app relies on to self-heal before posting.
drop policy if exists "Users can create their own profile" on profiles;
create policy "Users can create their own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- --- (B2) Backfill every existing auth user missing a profile ---------------
-- The one-time fix for users who signed up before the trigger existed.
-- Idempotent: only inserts where a profile is genuinely absent.
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(nullif(split_part(u.email, '@', 1), ''), 'Member')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- --- (B3) Harden the signup trigger -----------------------------------------
-- Now also seeds display_name (from full_name metadata, else email local
-- part) so newly-created users get a usable public identity immediately,
-- and on conflict does nothing so a race (trigger + client ensureProfile
-- both firing) can never itself throw.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, display_name)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Member'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- --- (C) Country context for Jeeb Li offers ---------------------------------
-- Jeeb Li offers already store origin/destination country as free text.
-- Listings carry a `country` (CA/US) used by the marketplace switcher, but
-- offers had no single "which market does this belong to" field. Derive it
-- from destination_country where possible so the CA/US switcher can filter
-- Jeeb Li too, without breaking the existing free-text columns.
alter table jeeb_li_offers
  add column if not exists market_country text check (market_country in ('CA', 'US'));

update jeeb_li_offers
set market_country = case
  when destination_country ilike '%canada%' or destination_country = 'CA' then 'CA'
  when destination_country ilike '%united states%' or destination_country ilike '%usa%' or destination_country = 'US' then 'US'
  else market_country
end
where market_country is null;

create index if not exists jeeb_li_offers_market_idx on jeeb_li_offers(market_country);
