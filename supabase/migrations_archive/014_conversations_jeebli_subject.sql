-- Jeeb Li conversations -------------------------------------------------
-- Conversations could previously only be "about" a listing (listing_id,
-- 003_messaging_schema.sql). A Jeeb Li traveler<->sender thread had nowhere
-- to attach. Rather than force Jeeb Li conversations to fake a listing_id,
-- or stand up a second, near-identical messaging table just for Jeeb Li,
-- this adds one more optional, mutually-exclusive reference. Both null
-- stays valid too — a general seller inquiry not tied to one specific item.

alter table conversations
  add column if not exists jeeb_li_offer_id uuid references jeeb_li_offers(id) on delete set null;

alter table conversations
  add constraint conversations_single_subject
  check (not (listing_id is not null and jeeb_li_offer_id is not null));

-- The old unique index only accounted for listing_id — two people could
-- otherwise end up with duplicate conversations that differ only by
-- jeeb_li_offer_id. Replace it with one that accounts for both subjects.
drop index if exists conversations_unique_pair_listing;
create unique index if not exists conversations_unique_pair_subject
  on conversations (
    least(participant_one, participant_two),
    greatest(participant_one, participant_two),
    coalesce(listing_id, '00000000-0000-0000-0000-000000000000'),
    coalesce(jeeb_li_offer_id, '00000000-0000-0000-0000-000000000000')
  );

-- Extends get_or_create_conversation (003_messaging_schema.sql) with the
-- same optional-subject pattern it already uses for listing_id, instead of
-- duplicating the whole function for Jeeb Li. Existing callers that only
-- ever passed (other_user_id, p_listing_id) keep working unchanged — the
-- new parameter defaults to null.
create or replace function get_or_create_conversation(
  other_user_id uuid,
  p_listing_id uuid default null,
  p_jeeb_li_offer_id uuid default null
)
returns uuid as $$
declare
  conv_id uuid;
begin
  if p_listing_id is not null and p_jeeb_li_offer_id is not null then
    raise exception 'a conversation can be about a listing or a Jeeb Li offer, not both';
  end if;

  select id into conv_id
  from conversations
  where least(participant_one, participant_two) = least(auth.uid(), other_user_id)
    and greatest(participant_one, participant_two) = greatest(auth.uid(), other_user_id)
    and coalesce(listing_id, '00000000-0000-0000-0000-000000000000')
      = coalesce(p_listing_id, '00000000-0000-0000-0000-000000000000')
    and coalesce(jeeb_li_offer_id, '00000000-0000-0000-0000-000000000000')
      = coalesce(p_jeeb_li_offer_id, '00000000-0000-0000-0000-000000000000');

  if conv_id is null then
    insert into conversations (participant_one, participant_two, listing_id, jeeb_li_offer_id)
    values (auth.uid(), other_user_id, p_listing_id, p_jeeb_li_offer_id)
    returning id into conv_id;
  end if;

  return conv_id;
end;
$$ language plpgsql security definer;
