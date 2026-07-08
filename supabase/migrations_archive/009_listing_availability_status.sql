-- Seller-controlled sale state, kept deliberately separate from the
-- existing `status` column. `status` already means something specific —
-- moderation/fraud state ('active' | 'pending_review' | ...), written by
-- the fraud-check Edge Function (001_fraud_check_schema.sql,
-- 002_fraud_check_trigger.sql) and read by the "Anyone can view active
-- listings" RLS policy. Repurposing it for "sold/inactive" would silently
-- break both. This is a new column instead, so nothing existing changes
-- behavior by default (every current row backfills to 'available').

alter table listings
  add column if not exists availability text not null default 'available'
    check (availability in ('available', 'sold', 'inactive'));

comment on column listings.availability is
  'Seller-controlled sale state, independent of moderation `status`. '
  'available = for sale and shown normally. '
  'sold = seller marked it sold; still visible (greyed out with a "Sold" '
  'ribbon in the UI) since a visible sales history is a trust signal for '
  'buyers browsing that seller''s profile. '
  'inactive = seller took the listing down (relisted, withdrawn, etc.); '
  'hidden from public browse entirely, same as a soft delete.';

create index if not exists listings_availability_idx on listings(availability);

-- Public browse should exclude `inactive` listings even when they still
-- pass the moderation `status = 'active'` check — the two are orthogonal.
-- `sold` stays publicly visible (handled in the app UI with a "Sold"
-- badge), only `inactive` is hidden. The seller can still see their own
-- listing in either state via the `seller_id = auth.uid()` clause.
drop policy if exists "Anyone can view active listings" on listings;
create policy "Anyone can view active listings"
  on listings for select
  using (
    (status = 'active' and availability <> 'inactive')
    or seller_id = auth.uid()
  );

-- Convenience RPC for the "Mark as sold" / "Deactivate listing" buttons in
-- the seller's own listing management UI — a thin, explicit surface rather
-- than letting the client issue a raw `update listings set availability=...`,
-- so a future UI can't accidentally let a seller flip someone else's
-- listing (the seller_id check happens twice: once here, once again for
-- free by the "Sellers can update their own listings" RLS policy already
-- in 001_fraud_check_schema.sql).
create or replace function set_listing_availability(
  p_listing_id uuid,
  p_availability text
)
returns void as $$
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
$$ language plpgsql security definer;
