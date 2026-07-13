-- ============================================================================
-- 019 — Fix user-deletion blockers + document correct deletion
--
-- PROBLEM: "users I deleted from Supabase can't sign up again."
--
-- Almost always this is because the user was deleted from the WRONG place:
-- deleting the `profiles` row (via Table Editor or `delete from profiles`)
-- leaves the `auth.users` row — and its email — intact. Supabase Auth then
-- rejects re-signup with "User already registered" because the email still
-- exists in auth.users. The correct deletion target is ALWAYS auth.users,
-- which cascades to profiles and everything else (profiles.id references
-- auth.users on delete cascade).
--
-- This migration also removes a latent FK that could BLOCK auth.users
-- deletion: moderation_queue.reviewed_by references profiles(id) with no
-- ON DELETE rule (defaults to NO ACTION), so if a moderator ever reviewed an
-- item, deleting that moderator's account would fail. We set it to
-- ON DELETE SET NULL (keep the moderation record, just forget who reviewed).
-- ============================================================================

-- Fix the blocking FK: drop and recreate with ON DELETE SET NULL.
do $$
declare
  c_name text;
begin
  select con.conname into c_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'moderation_queue'
    and con.contype = 'f'
    and pg_get_constraintdef(con.oid) ilike '%reviewed_by%';

  if c_name is not null then
    execute format('alter table moderation_queue drop constraint %I', c_name);
  end if;
end $$;

alter table moderation_queue
  add constraint moderation_queue_reviewed_by_fkey
  foreign key (reviewed_by) references profiles(id) on delete set null;

-- ── Clean up any ALREADY-ORPHANED data from past bad deletions ───────────────
-- If profiles rows were deleted directly in the past, their auth.users rows
-- may still linger (blocking re-signup). We can't see which were "meant" to
-- be deleted, so we DON'T auto-delete auth.users here (too destructive/blind).
-- Instead, the helper below lets you delete a specific user correctly by
-- email — see the admin function.

-- Admin helper: fully delete a user by email, the correct way (auth.users,
-- cascading everywhere). SECURITY DEFINER + admin check so only admins can
-- call it. Use this instead of deleting profiles rows by hand.
create or replace function admin_delete_user_by_email(target_email text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
begin
  if not is_admin() then
    return 'Not authorized';
  end if;

  select id into v_id from auth.users where email = lower(trim(target_email));
  if v_id is null then
    return 'No user found with that email';
  end if;

  -- Deleting auth.users cascades to profiles and all owned data.
  delete from auth.users where id = v_id;
  return 'Deleted user ' || target_email || ' (' || v_id || ')';
end;
$$;

grant execute on function admin_delete_user_by_email(text) to authenticated;
