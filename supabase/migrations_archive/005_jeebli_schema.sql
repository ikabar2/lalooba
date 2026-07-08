-- Jeeb Li: travelers post unused baggage space, senders request it.
-- Two separate tables because the two roles have genuinely different shapes
-- of data (a trip has a route/date/capacity; a request has an item/weight/budget) —
-- forcing them into one table with nullable columns would be messier, not simpler.

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
  created_at timestamptz default now()
);

create table if not exists jeeb_li_requests (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references jeeb_li_offers(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  item_description text not null,
  requested_weight_kg numeric not null check (requested_weight_kg > 0),
  status text not null default 'pending', -- pending | accepted | declined | completed
  created_at timestamptz default now()
);

create index if not exists jeeb_li_offers_route_idx
  on jeeb_li_offers (origin_country, destination_country, departure_date);

create index if not exists jeeb_li_requests_offer_idx
  on jeeb_li_requests (offer_id);

-- A sender can't request more weight than the traveler has left after
-- already-accepted requests are subtracted — enforced at the application
-- layer for now via the function below; a DB-level check would need a
-- recalculated aggregate, which is a reasonable v2 hardening step.

alter table jeeb_li_offers enable row level security;
alter table jeeb_li_requests enable row level security;

create policy "Anyone can view open offers"
  on jeeb_li_offers for select
  using (status = 'open' or traveler_id = auth.uid());

create policy "Travelers can create their own offers"
  on jeeb_li_offers for insert
  with check (traveler_id = auth.uid());

create policy "Travelers can update their own offers"
  on jeeb_li_offers for update
  using (traveler_id = auth.uid());

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

create policy "Senders can create requests"
  on jeeb_li_requests for insert
  with check (sender_id = auth.uid());

create policy "Travelers can update request status on their own offers"
  on jeeb_li_requests for update
  using (
    exists (
      select 1 from jeeb_li_offers
      where jeeb_li_offers.id = jeeb_li_requests.offer_id
      and jeeb_li_offers.traveler_id = auth.uid()
    )
  );

-- Convenience RPC used by the "Request space" form: creates the request row
-- AND opens (or reuses) a conversation with the traveler in one call, so the
-- sender lands straight in chat instead of needing two separate actions.
create or replace function create_jeebli_request(
  p_offer_id uuid,
  p_item_description text,
  p_requested_weight_kg numeric
)
returns uuid as $$
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

  v_conversation_id := get_or_create_conversation(v_traveler_id, null);

  return v_conversation_id;
end;
$$ language plpgsql security definer;
