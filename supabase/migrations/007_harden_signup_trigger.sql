-- ============================================================================
-- 007 — Harden the signup trigger so it can NEVER block account creation
--
-- ROOT CAUSE of "users can't sign up":
-- handle_new_user() runs on insert into auth.users and inserts a row into
-- public.profiles. profiles has constraints (the phone_must_be_north_american
-- CHECK, NOT NULL columns, and it depends on grants being intact). Because
-- the trigger fires as part of the SAME transaction as the auth.users insert,
-- ANY failure inside it — a phone value that doesn't match the CHECK, a
-- transient grant issue, anything — rolls back the whole transaction and the
-- signup fails with a generic "Database error saving new user". One fragile
-- profile insert was gating all account creation.
--
-- THE FIX (production-grade): the trigger's ONE job is to not break auth.
-- Profile creation is best-effort here and fully self-heals later:
--   • the phone is only written if it actually passes the NANP check, so a
--     malformed/edge-case number never trips the constraint (the app already
--     validates format client-side; this just stops a bad value from
--     bricking signup)
--   • the whole insert is wrapped so any unexpected error is caught and
--     logged as a warning instead of aborting the transaction — the auth
--     user is still created
--   • lib/ensure-profile.ts already creates/repairs the profile row on the
--     user's first authenticated action, so a skipped insert here is
--     recovered automatically with no user-visible effect
-- ============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  -- Only keep the phone if it passes the same NANP rule the column enforces.
  -- If it doesn't, store null rather than letting the CHECK abort signup.
  v_phone := new.raw_user_meta_data->>'phone';
  if v_phone is not null and v_phone !~ '^\+1[2-9]\d{2}[2-9]\d{6}$' then
    v_phone := null;
  end if;

  begin
    insert into public.profiles (id, full_name, phone, display_name)
    values (
      new.id,
      new.raw_user_meta_data->>'full_name',
      v_phone,
      coalesce(
        nullif(new.raw_user_meta_data->>'full_name', ''),
        nullif(split_part(new.email, '@', 1), ''),
        'Member'
      )
    )
    on conflict (id) do nothing;
  exception when others then
    -- Never let a profile-insert problem abort account creation. Log and
    -- move on; ensure-profile.ts backfills the row on first use.
    raise warning 'handle_new_user: profile insert skipped for % (%): %',
      new.id, new.email, sqlerrm;
  end;

  return new;
end;
$$;
