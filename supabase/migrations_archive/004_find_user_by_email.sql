-- Lets a logged-in user start a conversation by entering another real
-- registered user's email — this is the practical way to test messaging
-- locally with two test accounts before any real listings/sellers exist.
--
-- security definer is required here because auth.users isn't normally
-- readable by regular authenticated users — this function only ever
-- returns a profile id, never anything else from auth.users.
create or replace function find_user_by_email(lookup_email text)
returns uuid as $$
declare
  found_id uuid;
begin
  select id into found_id
  from auth.users
  where email = lower(trim(lookup_email))
  limit 1;

  return found_id; -- null if not found, handled client-side
end;
$$ language plpgsql security definer;
