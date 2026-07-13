-- ============================================================================
-- 020 — Inbox scalability: participant indexes + bounded preview query
--
-- Two issues at thousands-of-users scale:
--
-- 1. The inbox lists conversations with
--      .or(participant_one.eq.X, participant_two.eq.X).order(last_message_at)
--    and the unread RPCs join conversations by participant — but there was NO
--    index on the participant columns, so both seq-scanned the table.
--
-- 2. The inbox preview fetched EVERY message across all the user's
--    conversations (unbounded, grows with total message history) just to
--    keep the newest one per thread. conversation_previews() replaces that
--    with a DISTINCT ON query that returns exactly one row per conversation,
--    served by the existing messages(conversation_id, created_at) index.
-- ============================================================================

-- Participant lookups, newest-activity-first (matches the inbox ORDER BY).
create index if not exists conversations_p1_idx
  on conversations (participant_one, last_message_at desc);
create index if not exists conversations_p2_idx
  on conversations (participant_two, last_message_at desc);

-- Latest message per conversation for the CALLER's conversations, one row
-- each. SECURITY DEFINER with an explicit membership filter (same pattern as
-- the unread RPCs from 009).
create or replace function conversation_previews()
returns table (conversation_id uuid, content text, sender_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select distinct on (m.conversation_id)
         m.conversation_id, m.content, m.sender_id
  from messages m
  join conversations c on c.id = m.conversation_id
  where c.participant_one = auth.uid() or c.participant_two = auth.uid()
  order by m.conversation_id, m.created_at desc;
end;
$$;

grant execute on function conversation_previews() to authenticated;
