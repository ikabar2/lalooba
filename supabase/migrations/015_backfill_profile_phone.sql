-- ============================================================================
-- 015 — Backfill missing profile phones + keep them in sync
--
-- Fixes "phone is empty in the profiles table". Two causes were possible:
--   • the ensureProfile() self-heal created a phone-less row before the
--     signup trigger ran (and on-conflict-do-nothing then blocked the fill);
--   • older rows created before phone normalization existed.
--
-- This backfills phone onto any profile that is missing it, pulling the value
-- from the auth.users metadata the user supplied at signup — but only when it
-- passes the same NANP check the column enforces, so we never violate the
-- constraint.
-- ============================================================================

update profiles p
set phone = sub.phone
from (
  select
    u.id,
    u.raw_user_meta_data->>'phone' as phone
  from auth.users u
) sub
where p.id = sub.id
  and p.phone is null
  and sub.phone is not null
  and sub.phone ~ '^\+1[2-9]\d{2}[2-9]\d{6}$';

-- Keep phone in sync going forward: when a user updates their auth metadata
-- phone (or the trigger backfills late), mirror it onto profiles if the
-- profile currently has none. Runs on auth.users updates.
create or replace function sync_profile_phone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  v_phone := new.raw_user_meta_data->>'phone';
  if v_phone is not null and v_phone ~ '^\+1[2-9]\d{2}[2-9]\d{6}$' then
    update profiles
      set phone = v_phone
    where id = new.id
      and (phone is null or phone <> v_phone);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated_sync_phone on auth.users;
create trigger on_auth_user_updated_sync_phone
  after update on auth.users
  for each row
  execute function sync_profile_phone();
