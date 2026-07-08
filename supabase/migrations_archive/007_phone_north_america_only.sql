-- profiles.phone was never created — only phone_verified (a boolean flag)
-- existed, with nowhere to actually store the number itself.
alter table profiles
  add column if not exists phone text;

-- The real enforcement lives here, not in the signup form. Client-side
-- validation is just a UX nicety — anyone can call the Supabase API
-- directly and skip your React form entirely, so the database itself must
-- reject anything that isn't a valid North American (+1) number.
--
-- Format required: E.164 for NANP, e.g. +14165551234
--   +1               literal US/Canada country code
--   [2-9]\d{2}       area code — first digit can't be 0 or 1 (NANP rule)
--   [2-9]\d{2}       exchange code — same rule
--   \d{4}            subscriber number
alter table profiles drop constraint if exists phone_must_be_north_american;
alter table profiles
  add constraint phone_must_be_north_american
  check (phone is null or phone ~ '^\+1[2-9]\d{2}[2-9]\d{6}$');

-- Update the signup trigger to also copy phone from the metadata passed
-- into supabase.auth.signUp({ options: { data: { phone, full_name } } }).
-- If a non-North-American number ever reaches this trigger (e.g. someone
-- bypassing the form and calling the API directly), the CHECK constraint
-- above causes the entire signup transaction to fail — auth.users insert
-- rolls back too, so you never end up with an orphaned auth account that
-- has no matching profile.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;
