-- Messaging system: conversations + messages, with strict RLS so only the
-- two participants can ever read or write a given conversation.

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete set null,
  participant_one uuid not null references profiles(id) on delete cascade,
  participant_two uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  last_message_at timestamptz default now(),
  -- Prevents duplicate conversations between the same two people about the
  -- same listing, regardless of which order the participants are stored in.
  constraint distinct_participants check (participant_one <> participant_two)
);

-- Enforce uniqueness regardless of participant order (A,B) == (B,A)
create unique index if not exists conversations_unique_pair_listing
  on conversations (
    least(participant_one, participant_two),
    greatest(participant_one, participant_two),
    coalesce(listing_id, '00000000-0000-0000-0000-000000000000')
  );

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz default now(),
  read_at timestamptz
);

create index if not exists messages_conversation_idx on messages(conversation_id, created_at);

alter table conversations enable row level security;
alter table messages enable row level security;

create policy "Participants can view their conversations"
  on conversations for select
  using (auth.uid() = participant_one or auth.uid() = participant_two);

create policy "Participants can create conversations they're part of"
  on conversations for insert
  with check (auth.uid() = participant_one or auth.uid() = participant_two);

create policy "Participants can view messages in their conversations"
  on messages for select
  using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and (conversations.participant_one = auth.uid() or conversations.participant_two = auth.uid())
    )
  );

create policy "Participants can send messages in their conversations"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and (conversations.participant_one = auth.uid() or conversations.participant_two = auth.uid())
    )
  );

-- Keep conversations sorted by recency without a trigger round-trip per message
create or replace function touch_conversation_last_message()
returns trigger as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_message_sent on messages;
create trigger on_message_sent
  after insert on messages
  for each row
  execute function touch_conversation_last_message();

-- Get-or-create — called by the "Message seller" button. Prevents duplicate
-- conversations and handles the participant-order ambiguity cleanly.
create or replace function get_or_create_conversation(other_user_id uuid, p_listing_id uuid default null)
returns uuid as $$
declare
  conv_id uuid;
begin
  select id into conv_id
  from conversations
  where least(participant_one, participant_two) = least(auth.uid(), other_user_id)
    and greatest(participant_one, participant_two) = greatest(auth.uid(), other_user_id)
    and coalesce(listing_id, '00000000-0000-0000-0000-000000000000')
      = coalesce(p_listing_id, '00000000-0000-0000-0000-000000000000');

  if conv_id is null then
    insert into conversations (participant_one, participant_two, listing_id)
    values (auth.uid(), other_user_id, p_listing_id)
    returning id into conv_id;
  end if;

  return conv_id;
end;
$$ language plpgsql security definer;

-- Required for the realtime message subscription used by MessageThread.tsx
alter publication supabase_realtime add table messages;
