-- ============================================================================
-- 021 — Phone validation fix + signup country
--
-- 1. RELAX the phone CHECK from  ^\+1[2-9]\d{2}[2-9]\d{6}$
--                          to    ^\+1[2-9]\d{9}$
--    Keeps the E.164 +1 / area-code NANP invariant but drops the
--    exchange-first-digit rule that caused valid numbers to be rejected.
--    NON-BREAKING: the new pattern is a strict SUPERSET of the old one —
--    every existing row that passed before still passes.
--
-- 2. handle_new_user now also stores the signup COUNTRY (CA/US) from the
--    user's metadata, and phone remains best-effort/optional: an invalid or
--    missing phone stores NULL and never blocks account creation.
--
-- 3. sync_profile_phone updated to the same relaxed pattern.
-- ============================================================================

-- Relax the constraint (drop by name pattern, re-add).
do $$
declare
  c_name text;
begin
  select con.conname into c_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'profiles'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%phone%';
  if c_name is not null then
    execute format('alter table profiles drop constraint %I', c_name);
  end if;
end $$;

alter table profiles
  add constraint phone_must_be_north_american
  check (phone is null or phone ~ '^\+1[2-9]\d{9}$');

-- Trigger: phone best-effort (relaxed rule), country stored when valid.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_country text;
begin
  v_phone := new.raw_user_meta_data->>'phone';
  if v_phone is null or v_phone !~ '^\+1[2-9]\d{9}$' then
    v_phone := null; -- invalid/missing phone never blocks signup
  end if;

  v_country := upper(coalesce(new.raw_user_meta_data->>'country', ''));
  if v_country not in ('CA', 'US') then
    v_country := null;
  end if;

  begin
    insert into public.profiles (id, full_name, phone, display_name, country)
    values (
      new.id,
      new.raw_user_meta_data->>'full_name',
      v_phone,
      coalesce(
        nullif(new.raw_user_meta_data->>'full_name', ''),
        nullif(split_part(new.email, '@', 1), ''),
        'Member'
      ),
      v_country
    )
    on conflict (id) do nothing;
  exception when others then
    raise warning 'handle_new_user: profile insert skipped for % (%): %',
      new.id, new.email, sqlerrm;
  end;

  return new;
end;
$$;

-- Phone sync trigger: same relaxed rule, and never abort the auth update.
create or replace function sync_profile_phone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  begin
    v_phone := new.raw_user_meta_data->>'phone';
    if v_phone is not null and v_phone ~ '^\+1[2-9]\d{9}$' then
      update profiles
        set phone = v_phone
      where id = new.id
        and (phone is null or phone <> v_phone);
    end if;
  exception when others then
    raise warning 'sync_profile_phone skipped for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;
