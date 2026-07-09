-- ============================================================================
-- 009 — Persistent read/unread status for messaging
--
-- messages.read_at already exists but nothing ever set it, and there was no
-- UPDATE policy on messages, so "mark as seen" couldn't work and every
-- message stayed unread forever. This adds:
--   • mark_conversation_read(conversation_id) — sets read_at = now() on all
--     messages in a conversation that were sent by the OTHER participant and
--     are still unread. Called when the recipient opens the thread.
--   • unread_message_count() — total unread messages across all of the
--     caller's conversations, for the header notification badge.
--   • an index to keep the unread lookups cheap at scale.
--
-- Both are SECURITY DEFINER and check auth.uid() membership internally, so
-- they don't require a broad UPDATE policy on messages (which would let a
-- user rewrite read state on rows they shouldn't touch). This is the
-- least-privilege way to expose exactly "mark my received messages read".
-- ============================================================================

-- Partial index: unread messages, by conversation. Serves both the per-
-- conversation mark-read and the global unread count without scanning all
-- messages once volume grows.
create index if not exists messages_unread_idx
  on messages (conversation_id, sender_id)
  where read_at is null;

-- Mark every message in a conversation that the CALLER received (i.e. didn't
-- send) and hasn't read yet as read. Returns the number of rows updated.
create or replace function mark_conversation_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  -- Caller must be a participant in the conversation, or this is a no-op.
  if not exists (
    select 1 from conversations c
    where c.id = p_conversation_id
      and (c.participant_one = auth.uid() or c.participant_two = auth.uid())
  ) then
    return 0;
  end if;

  update messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()   -- only messages the caller RECEIVED
    and read_at is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

-- Total unread messages addressed to the caller across all their
-- conversations — for the header badge.
create or replace function unread_message_count()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*)
  into v_count
  from messages m
  join conversations c on c.id = m.conversation_id
  where (c.participant_one = auth.uid() or c.participant_two = auth.uid())
    and m.sender_id <> auth.uid()
    and m.read_at is null;

  return coalesce(v_count, 0);
end;
$$;

-- Per-conversation unread count for the caller, returned as a set so the
-- inbox can show a badge on each conversation row in one round-trip.
create or replace function unread_counts_by_conversation()
returns table (conversation_id uuid, unread integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select m.conversation_id, count(*)::integer as unread
  from messages m
  join conversations c on c.id = m.conversation_id
  where (c.participant_one = auth.uid() or c.participant_two = auth.uid())
    and m.sender_id <> auth.uid()
    and m.read_at is null
  group by m.conversation_id;
end;
$$;

grant execute on function mark_conversation_read(uuid) to authenticated;
grant execute on function unread_message_count() to authenticated;
grant execute on function unread_counts_by_conversation() to authenticated;
