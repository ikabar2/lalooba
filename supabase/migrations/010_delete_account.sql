-- ============================================================================
-- 010 — Self-service account deletion
--
-- Lets a signed-in user permanently delete their OWN account. Admin auth
-- APIs (auth.admin.deleteUser) require the service_role key and can't be
-- called from the browser, so the standard pattern is a SECURITY DEFINER
-- function that deletes the caller's auth.users row using auth.uid().
--
-- Deleting the auth.users row cascades automatically:
--   auth.users → public.profiles (profiles.id references auth.users.id
--     on delete cascade in the base schema) → and every table that
--     references profiles(id) on delete cascade (listings, messages,
--     conversations, jeeb_li_offers/requests, reviews) is removed in turn.
-- So one delete removes the user and all their associated data.
--
-- SECURITY DEFINER + the auth.uid() filter means a user can ONLY ever delete
-- themselves — there's no parameter to pass someone else's id. After calling
-- this, the client must sign out (the session references a now-deleted user)
-- and redirect home.
-- ============================================================================

create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Deleting the auth user cascades to profiles and everything owned by the
  -- profile. This is the single source of truth for "remove this account."
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function delete_own_account() to authenticated;
