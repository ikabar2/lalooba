-- ============================================================================
-- Lalooba — initial schema
--
-- Consolidates what was built incrementally across 15 migrations into one
-- production-ready initial migration. Represents final state only — e.g.
-- listings.title_en/title_ar exist from creation, there was never a plain
-- `title` column to begin with in this version. Scoped strictly to what the
-- application code (Next.js app + fraud-check Edge Function) actually reads
-- and writes today; nothing here is speculative.
--
-- Run this once against a fresh Supabase project, in order top to bottom —
-- later sections depend on tables/functions created earlier in this same
-- file (e.g. RLS policies on `listings` reference `profiles`).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------

-- gen_random_uuid() for every table's primary key default.
create extension if not exists pgcrypto;

-- Lets the fraud-check trigger call the fraud-check Edge Function over HTTP
-- from inside Postgres. Enabled by default on Supabase, declared explicitly
-- here so this migration is self-contained.
create extension if not exists pg_net;


-- ----------------------------------------------------------------------------
-- profiles
--
-- One row per auth.users row, created automatically by the on_auth_user_created
-- trigger below — the app never inserts into this table directly. Every other
-- table that references a "user" (seller, traveler, sender, reviewer,
-- message participant) points here, not at auth.users, since auth.users
-- isn't readable by normal authenticated clients.
-- ----------------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  -- E.164 North American format only — enforced below, not just client-side,
  -- since anyone can call the Supabase API directly and skip the signup form.
  phone text,
  role text not null default 'user', -- user | moderator | admin
  phone_verified boolean not null default false,
  id_verified boolean not null default false,
  trust_score integer not null default 0,
  -- Bilingual, both nullable — a profile is valid with just one language
  -- filled in. The seller profile page falls back to the English field when
  -- the Arabic one is null (and vice versa for an Arabic-first seller).
  city_en text,
  city_ar text,
  country text check (country in ('CA', 'US')),
  bio_en text,
  bio_ar text,
  created_at timestamptz not null default now(),

  constraint phone_must_be_north_american
    check (phone is null or phone ~ '^\+1[2-9]\d{2}[2-9]\d{6}$')
);

comment on table profiles is
  'One row per auth.users row, created by on_auth_user_created. Public profile basics (name, verified badges) are readable by anyone; the rest is filled in by the seller themselves after signup.';
comment on column profiles.phone is
  'E.164 NANP format (+1XXXXXXXXXX). NULL allowed (e.g. pre-verification), but any non-null value must pass the phone_must_be_north_american check — this is how "Lalooba is US/Canada only" is actually enforced, not just suggested in the signup form.';

alter table profiles enable row level security;

drop policy if exists "Anyone can view profiles" on profiles;
create policy "Anyone can view profiles"
  on profiles for select
  using (true); -- name, city, bio, verified badge are meant to be public

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);


-- ----------------------------------------------------------------------------
-- jeeb_li_offers / jeeb_li_requests
--
-- Jeeb Li: travelers post unused baggage space (an "offer"); people wanting
-- something brought over post a "request" against a specific offer. Two
-- tables because the two roles have genuinely different data shapes — a
-- trip has a route/date/capacity, a request has an item/weight — forcing
-- them into one nullable-heavy table would be messier, not simpler.
-- Declared before `listings`/`conversations` since both reference
-- jeeb_li_offers by foreign key.
-- ----------------------------------------------------------------------------

create table if not exists jeeb_li_offers (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references profiles(id) on delete cascade,
  origin_city text not null,
  origin_country text not null,
  destination_city text not null,
  destination_country text not null,
  departure_date date not null,
  available_weight_kg numeric not null check (available_weight_kg > 0),
  price_per_kg numeric not null check (price_per_kg >= 0),
  allowed_items text,
  status text not null default 'open', -- open | full | completed | cancelled
  created_at timestamptz not null default now()
);

comment on table jeeb_li_offers is 'A traveler''s posted trip with available baggage space.';

create index if not exists jeeb_li_offers_route_idx
  on jeeb_li_offers (origin_country, destination_country, departure_date);

alter table jeeb_li_offers enable row level security;

drop policy if exists "Anyone can view open offers" on jeeb_li_offers;
create policy "Anyone can view open offers"
  on jeeb_li_offers for select
  using (status = 'open' or traveler_id = auth.uid());

drop policy if exists "Travelers can create their own offers" on jeeb_li_offers;
create policy "Travelers can create their own offers"
  on jeeb_li_offers for insert
  with check (traveler_id = auth.uid());

drop policy if exists "Travelers can update their own offers" on jeeb_li_offers;
create policy "Travelers can update their own offers"
  on jeeb_li_offers for update
  using (traveler_id = auth.uid());


create table if not exists jeeb_li_requests (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references jeeb_li_offers(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  item_description text not null,
  requested_weight_kg numeric not null check (requested_weight_kg > 0),
  status text not null default 'pending', -- pending | accepted | declined | completed
  created_at timestamptz not null default now()
);

comment on table jeeb_li_requests is 'A sender''s request for space on a specific Jeeb Li offer.';

create index if not exists jeeb_li_requests_offer_idx on jeeb_li_requests(offer_id);

alter table jeeb_li_requests enable row level security;

drop policy if exists "Travelers can view requests on their own offers" on jeeb_li_requests;
create policy "Travelers can view requests on their own offers"
  on jeeb_li_requests for select
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from jeeb_li_offers
      where jeeb_li_offers.id = jeeb_li_requests.offer_id
        and jeeb_li_offers.traveler_id = auth.uid()
    )
  );

drop policy if exists "Senders can create requests" on jeeb_li_requests;
create policy "Senders can create requests"
  on jeeb_li_requests for insert
  with check (sender_id = auth.uid());

drop policy if exists "Travelers can update request status on their own offers" on jeeb_li_requests;
create policy "Travelers can update request status on their own offers"
  on jeeb_li_requests for update
  using (
    exists (
      select 1 from jeeb_li_offers
      where jeeb_li_offers.id = jeeb_li_requests.offer_id
        and jeeb_li_offers.traveler_id = auth.uid()
    )
  );

-- NOTE: nothing here stops a sender from requesting more total weight than
-- a traveler has left once already-accepted requests are subtracted — that
-- would need a recalculated aggregate check. Flagged as a reasonable v2
-- hardening step, not implemented because the app doesn't implement that
-- check anywhere today either.


-- ----------------------------------------------------------------------------
-- listings
--
-- The marketplace item table. Bilingual title/city (matching every other
-- piece of user-facing content in the app), explicit currency (a listing's
-- price is genuinely ambiguous between CAD/USD on a cross-border
-- marketplace without it), category constrained to the exact set the UI's
-- category picker offers, and two independent status concepts that must
-- not be confused with each other:
--
--   status        moderation/fraud state, written by the fraud-check
--                 pipeline below. active | pending_review.
--   availability  seller-controlled sale state. available | sold | inactive.
--
-- A listing can be status='active' and availability='sold' at the same
-- time — that's normal, not a conflict. Confusing the two would either
-- hide legitimate sold listings or show fraud-flagged ones.
-- ----------------------------------------------------------------------------

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,

  title_en text not null,
  title_ar text, -- nullable: a listing is valid with just an English title
  description text,

  price numeric not null,
  currency text not null default 'CAD' check (currency in ('CAD', 'USD')),

  city_en text not null,
  city_ar text,
  country text not null,

  category text check (category in (
    'cat_clothing', 'cat_food', 'cat_crafts', 'cat_furniture',
    'cat_electronics', 'cat_cars', 'cat_barbershop', 'cat_tax', 'cat_other'
  )),

  images text[] not null default '{}',

  -- Moderation / fraud state — written by trigger_fraud_check below, read
  -- by the "Anyone can view active listings" policy.
  status text not null default 'active',
  flagged boolean not null default false,
  flag_reason text,

  -- Seller-controlled sale state — independent of `status` above.
  availability text not null default 'available'
    check (availability in ('available', 'sold', 'inactive')),

  -- Featured-marketplace system. New listings are auto-featured for 24h for
  -- free (see set_default_featured_until below); featured_source/priority
  -- exist so a future paid-promotion flow is a data change on these same
  -- columns, not a schema change.
  featured_until timestamptz,
  featured_source text not null default 'auto' check (featured_source in ('auto', 'paid')),
  featured_priority integer not null default 0,

  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title_en, '') || ' ' || coalesce(title_ar, ''))
  ) stored,

  created_at timestamptz not null default now()
);

comment on table listings is 'Marketplace items. See column comments on availability/featured_* for the two independent status systems.';
comment on column listings.title_ar is 'Nullable — UI falls back to title_en when null.';
comment on column listings.status is 'Moderation/fraud state (active | pending_review), written by the fraud-check pipeline. NOT the same concept as availability.';
comment on column listings.availability is
  'Seller-controlled sale state, independent of moderation `status`. available = for sale. sold = seller marked it sold; stays publicly visible (with a "Sold" badge) since a visible sales history is a trust signal on the seller''s profile. inactive = seller took it down; hidden from public browse, same as a soft delete.';
comment on column listings.featured_until is 'Listing is eligible for the featured set while now() < featured_until. NULL = never featured.';
comment on column listings.featured_source is 'auto = free automatic new-listing feature. paid = bought promotion. A future payments feature sets featured_until/priority/source on an existing row — no schema change needed.';
comment on column listings.featured_priority is 'Higher ranks first when more listings are eligible than there are featured slots. Auto = 0; reserved for future paid tiers.';

create index if not exists listings_category_idx on listings(category);
create index if not exists listings_availability_idx on listings(availability);
create index if not exists listings_search_idx on listings using gin(search_vector);

-- Composite index for the actual browse/filter query pattern the app uses:
-- category + country + availability, newest first.
create index if not exists listings_browse_idx
  on listings (category, country, availability, created_at desc);

-- Partial index supporting the featured-ranking query directly — restricted
-- to exactly the rows that could ever qualify as featured.
create index if not exists listings_featured_rank_idx
  on listings (featured_priority desc, created_at desc)
  where status = 'active' and availability = 'available';

alter table listings enable row level security;

-- `inactive` listings are hidden from public browse even when they pass
-- moderation — the two checks are orthogonal, see table comment above.
-- The owner can always see their own listing regardless of state.
drop policy if exists "Anyone can view active listings" on listings;
create policy "Anyone can view active listings"
  on listings for select
  using (
    (status = 'active' and availability <> 'inactive')
    or seller_id = auth.uid()
  );

drop policy if exists "Users can create their own listings" on listings;
create policy "Users can create their own listings"
  on listings for insert
  with check (seller_id = auth.uid());

drop policy if exists "Sellers can update their own listings" on listings;
create policy "Sellers can update their own listings"
  on listings for update
  using (seller_id = auth.uid());

drop policy if exists "Sellers can delete their own listings" on listings;
create policy "Sellers can delete their own listings"
  on listings for delete
  using (seller_id = auth.uid());

drop policy if exists "Moderators can view all listings regardless of status" on listings;
create policy "Moderators can view all listings regardless of status"
  on listings for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

-- Auto-feature every new listing for 24h for free, at default priority.
create or replace function set_default_featured_until()
returns trigger
language plpgsql
as $$
begin
  if new.featured_until is null then
    new.featured_until := coalesce(new.created_at, now()) + interval '24 hours';
  end if;
  return new;
end;
$$;

drop trigger if exists on_listing_insert_set_featured on listings;
create trigger on_listing_insert_set_featured
  before insert on listings
  for each row
  execute function set_default_featured_until();

-- Single source of truth for "how many featured slots exist at once" — a
-- view can't take a parameter, so this is a function other objects call
-- instead of a magic number duplicated in several places.
create or replace function featured_slot_limit()
returns integer
language sql
immutable
as $$
  select 12;
$$;

-- "What's featured right now." Ranked by featured_priority desc (paid
-- promotions win ties once that column is ever set nonzero) then
-- created_at desc (newest auto-features win among themselves), capped at
-- featured_slot_limit(). This is what makes "24h or until replaced by
-- newer listings" work without a cron job: a listing's own 24h window
-- never changes, but once more than the slot limit are still inside their
-- window, only the top N rank inside this view and the rest simply fall
-- out of it.
--
-- security_invoker: runs under the querying user's own RLS, not the view
-- owner's, so it can never surface a listing the caller couldn't already
-- see directly via the base table's policies. Requires Postgres 15+.
create or replace view featured_listings
  with (security_invoker = true) as
select *
from (
  select
    l.*,
    row_number() over (
      order by l.featured_priority desc, l.created_at desc
    ) as featured_rank
  from listings l
  where l.status = 'active'
    and l.availability = 'available'
    and l.featured_until is not null
    and l.featured_until > now()
) ranked
where featured_rank <= featured_slot_limit();

comment on view featured_listings is 'Currently-featured listings, ranked and slot-limited. Backs the homepage Featured section.';

-- Cheap single-listing check (e.g. "show a Featured badge on this detail
-- page") without pulling the whole ranked set. stable, not immutable: it
-- depends on now() and sibling rows.
create or replace function is_listing_featured(p_listing_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from featured_listings where id = p_listing_id
  );
$$;

-- Explicit, ownership-checked surface for "Mark as sold" / "Deactivate
-- listing" rather than letting the client issue a raw UPDATE — the
-- seller_id check happens here AND again for free via the "Sellers can
-- update their own listings" RLS policy above.
create or replace function set_listing_availability(
  p_listing_id uuid,
  p_availability text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_availability not in ('available', 'sold', 'inactive') then
    raise exception 'invalid availability value: %', p_availability;
  end if;

  update listings
  set availability = p_availability
  where id = p_listing_id
    and seller_id = auth.uid();

  if not found then
    raise exception 'listing not found or not owned by current user';
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- moderation_queue
--
-- Where fraud-flagged listings land for a human moderator to review.
-- Written by trigger_fraud_check (see bottom of this file); read by a
-- future admin dashboard, not yet built. Sellers never see their own flag
-- reasons — only role='admin'/'moderator' profiles can read this table.
-- ----------------------------------------------------------------------------

create table if not exists moderation_queue (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  seller_id uuid references profiles(id) on delete cascade,
  reasons text[] not null,
  risk_score integer not null,
  status text not null default 'pending', -- pending | approved | rejected
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id)
);

comment on table moderation_queue is 'Fraud-check output for a human moderator to review. Only readable by admin/moderator profiles.';

create index if not exists moderation_queue_status_idx on moderation_queue(status);

alter table moderation_queue enable row level security;

drop policy if exists "Moderators can view queue" on moderation_queue;
create policy "Moderators can view queue"
  on moderation_queue for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

drop policy if exists "Moderators can update queue" on moderation_queue;
create policy "Moderators can update queue"
  on moderation_queue for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );


-- ----------------------------------------------------------------------------
-- conversations / messages
--
-- A conversation is between exactly two participants and is optionally
-- "about" a listing OR a Jeeb Li offer — never both at once. Both null is
-- also valid: a general inquiry not tied to one specific item.
-- ----------------------------------------------------------------------------

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete set null,
  jeeb_li_offer_id uuid references jeeb_li_offers(id) on delete set null,
  participant_one uuid not null references profiles(id) on delete cascade,
  participant_two uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),

  constraint distinct_participants check (participant_one <> participant_two),
  constraint conversations_single_subject
    check (not (listing_id is not null and jeeb_li_offer_id is not null))
);

comment on table conversations is 'A thread between two participants, optionally about a listing or a Jeeb Li offer (never both).';

-- Enforces uniqueness regardless of participant order (A,B) == (B,A), and
-- regardless of which single subject (or neither) the conversation is about.
create unique index if not exists conversations_unique_pair_subject
  on conversations (
    least(participant_one, participant_two),
    greatest(participant_one, participant_two),
    coalesce(listing_id, '00000000-0000-0000-0000-000000000000'),
    coalesce(jeeb_li_offer_id, '00000000-0000-0000-0000-000000000000')
  );

alter table conversations enable row level security;

drop policy if exists "Participants can view their conversations" on conversations;
create policy "Participants can view their conversations"
  on conversations for select
  using (auth.uid() = participant_one or auth.uid() = participant_two);

drop policy if exists "Participants can create conversations they're part of" on conversations;
create policy "Participants can create conversations they're part of"
  on conversations for insert
  with check (auth.uid() = participant_one or auth.uid() = participant_two);


create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

comment on table messages is 'Messages within a conversation. Realtime-enabled for live message delivery.';

create index if not exists messages_conversation_idx on messages(conversation_id, created_at);

alter table messages enable row level security;

drop policy if exists "Participants can view messages in their conversations" on messages;
create policy "Participants can view messages in their conversations"
  on messages for select
  using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and (conversations.participant_one = auth.uid() or conversations.participant_two = auth.uid())
    )
  );

drop policy if exists "Participants can send messages in their conversations" on messages;
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

-- Keeps conversations sorted by recency without a client round-trip per
-- message. security definer: there's no general UPDATE policy on
-- conversations for participants, so this trigger needs elevated rights to
-- write last_message_at on their behalf.
create or replace function touch_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_sent on messages;
create trigger on_message_sent
  after insert on messages
  for each row
  execute function touch_conversation_last_message();

-- Realtime message delivery for the message thread UI. ALTER PUBLICATION
-- has no IF NOT EXISTS clause in any Postgres version (unlike CREATE TABLE/
-- INDEX/POLICY) — re-running a bare ADD TABLE against a table already in
-- the publication throws "relation already member of publication". This
-- checks pg_publication_tables first so the statement is skipped, not
-- re-run, when it's already in place.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;

-- Get-or-create, called by the "Message seller" button and by
-- create_jeebli_request below. Optional listing_id / jeeb_li_offer_id are
-- mutually exclusive, matching the conversations_single_subject constraint.
create or replace function get_or_create_conversation(
  other_user_id uuid,
  p_listing_id uuid default null,
  p_jeeb_li_offer_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- Convenience RPC for the "Request space" form: inserts the request AND
-- opens (or reuses) a conversation with the traveler about that specific
-- offer, in one call, so the sender lands straight in chat.
create or replace function create_jeebli_request(
  p_offer_id uuid,
  p_item_description text,
  p_requested_weight_kg numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_traveler_id uuid;
  v_conversation_id uuid;
begin
  select traveler_id into v_traveler_id
  from jeeb_li_offers
  where id = p_offer_id;

  if v_traveler_id is null then
    raise exception 'Offer not found';
  end if;

  insert into jeeb_li_requests (offer_id, sender_id, item_description, requested_weight_kg)
  values (p_offer_id, auth.uid(), p_item_description, p_requested_weight_kg);

  v_conversation_id := get_or_create_conversation(v_traveler_id, null, p_offer_id);

  return v_conversation_id;
end;
$$;

-- Lets a logged-in user start a conversation by entering another real
-- registered user's email — the practical way to test messaging locally
-- with two test accounts before any real listings/sellers exist.
-- security definer: auth.users isn't normally readable by authenticated
-- users; this only ever returns a profile id, nothing else from auth.users.
create or replace function find_user_by_email(lookup_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found_id uuid;
begin
  select id into found_id
  from auth.users
  where email = lower(trim(lookup_email))
  limit 1;

  return found_id; -- null if not found, handled client-side
end;
$$;


-- ----------------------------------------------------------------------------
-- reviews
--
-- Trust model, stated plainly: NOT gated behind a verified transaction —
-- there's no checkout/order system to gate against, since marketplace and
-- Jeeb Li deals are arranged through messaging and happen off-platform.
-- Instead: one review per (reviewer, seller) pair, must be authenticated,
-- can't review yourself. A pragmatic MVP trust model, not the strongest
-- possible one — revisit if an actual transaction record ever exists to
-- require instead of just an account.
-- ----------------------------------------------------------------------------

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid references listings(id) on delete set null, -- optional context, not required
  rating integer not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),

  constraint reviews_no_self_review check (seller_id <> reviewer_id),
  constraint reviews_one_per_reviewer unique (seller_id, reviewer_id)
);

comment on table reviews is 'One review per (reviewer, seller) pair. Not gated behind a verified transaction — see table comment in the migration source for the reasoning.';

create index if not exists reviews_seller_idx on reviews(seller_id);

alter table reviews enable row level security;

drop policy if exists "Anyone can read reviews" on reviews;
create policy "Anyone can read reviews"
  on reviews for select
  using (true); -- public trust signal, same as listings themselves

drop policy if exists "Authenticated users can write their own review" on reviews;
create policy "Authenticated users can write their own review"
  on reviews for insert
  with check (reviewer_id = auth.uid());

drop policy if exists "Reviewers can edit their own review" on reviews;
create policy "Reviewers can edit their own review"
  on reviews for update
  using (reviewer_id = auth.uid());

drop policy if exists "Reviewers can delete their own review" on reviews;
create policy "Reviewers can delete their own review"
  on reviews for delete
  using (reviewer_id = auth.uid());

-- Convenience aggregate for the seller profile page — one query instead of
-- computing avg/count client-side or duplicating the aggregation elsewhere.
create or replace view seller_rating_summary
  with (security_invoker = true) as
select
  seller_id,
  round(avg(rating)::numeric, 1) as average_rating,
  count(*) as review_count
from reviews
group by seller_id;

comment on view seller_rating_summary is 'Average rating + review count per seller. Backs the seller profile page.';


-- ----------------------------------------------------------------------------
-- Storage: listing-images bucket
--
-- Public read (anyone can view a photo on an active listing, matching the
-- "browse without signing up" product decision); writes restricted to the
-- authenticated owner of the folder. Files are stored under
-- `{user_id}/{filename}` — policies check the first path segment matches
-- the uploader's own auth uid, so one seller can never overwrite or delete
-- another's photos.
--
-- file_size_limit/allowed_mime_types are enforced by Supabase Storage
-- itself before a file is written to disk. HONEST LIMITATION: this checks
-- the declared Content-Type, not the actual byte content — a renamed
-- non-image file with a spoofed header would pass this check. The genuinely
-- robust fix is server-side re-encoding (an Edge Function decodes and
-- rewrites every upload; a disguised payload fails to decode and gets
-- rejected) — meaningfully more work, not implemented here, flagged as the
-- recommended next step.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  5242880, -- 5 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view listing images" on storage.objects;
create policy "Anyone can view listing images"
  on storage.objects for select
  using (bucket_id = 'listing-images');

drop policy if exists "Users can upload their own listing images" on storage.objects;
create policy "Users can upload their own listing images"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own listing images" on storage.objects;
create policy "Users can delete their own listing images"
  on storage.objects for delete
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ----------------------------------------------------------------------------
-- auth.users -> profiles signup trigger
--
-- Declared last because it references profiles(city_en etc. not set here,
-- only id/full_name/phone) — kept at the end of the file only for
-- readability; there's no ordering dependency forcing this position.
-- Without this, supabase.auth.signUp() creates a row in auth.users but
-- never in public.profiles, and every other table's seller_id/sender_id/
-- etc. foreign key would have nothing valid to point to.
-- ----------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();


-- ----------------------------------------------------------------------------
-- Fraud-check pipeline
--
-- Calls the fraud-check Edge Function automatically whenever a new listing
-- is inserted. Replace <PROJECT_REF> below with your actual Supabase
-- project reference, and set the service role key as a Postgres setting via
-- the Supabase dashboard (Database > Extensions > pg_net / Vault) rather
-- than hardcoding it here.
-- ----------------------------------------------------------------------------

create or replace function trigger_fraud_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(url := 'https://bxspvlvizdxhgwxgfzvp.supabase.co/functions/v1/fraud-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('listing_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists on_listing_created on listings;
create trigger on_listing_created
  after insert on listings
  for each row
  execute function trigger_fraud_check();
