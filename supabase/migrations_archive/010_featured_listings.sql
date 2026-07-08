-- Featured Marketplace system -----------------------------------------------
--
-- Goal: every new listing is featured for free, automatically, for up to 24
-- hours — or until newer listings replace it, whichever comes first. Later,
-- this needs to become a paid promotion with the *same* underlying columns,
-- so a payments feature is an INSERT/UPDATE, not a migration.
--
-- Three columns carry the whole system:
--
--   featured_until    When this listing stops being eligible to appear in
--                      the featured set. Auto-features get created_at + 24h
--                      (set by the trigger below). A future paid promotion
--                      just sets this to whatever the buyer paid for (7
--                      days, 30 days, ...) — no new column needed.
--
--   featured_source    'auto' (free, automatic) | 'paid' (bought). Lets the
--                      UI/analytics tell the two apart (e.g. "Featured" vs
--                      "Sponsored" badge) without changing how eligibility
--                      or ranking works.
--
--   featured_priority  Tie-breaker for ranking when more listings are
--                      eligible than there are featured slots. Auto listings
--                      default to 0. A future paid tier sets this higher
--                      (e.g. 50 for "Featured", 100 for "Premium") so paid
--                      promotions always outrank free ones without any
--                      change to the ranking query itself.
--
-- "24 hours OR until newer listings replace it" is deliberately NOT
-- implemented by mutating featured_until again as new listings arrive. A
-- listing keeps its own fixed 24h window no matter what. Instead, the
-- featured_listings view below caps the *result set* at a fixed slot count,
-- ranked by priority then recency. That's what makes "replaced by newer
-- listings" happen automatically: once more than the slot limit are still
-- inside their 24h window, only the top N show as featured and the rest
-- simply fall out of the ranked window — no cron job, no extra writes.

alter table listings
  add column if not exists featured_until timestamptz,
  add column if not exists featured_source text not null default 'auto'
    check (featured_source in ('auto', 'paid')),
  add column if not exists featured_priority integer not null default 0;

comment on column listings.featured_until is
  'Listing is eligible for the featured set while now() < featured_until. NULL = never featured (e.g. rows inserted before this feature existed).';
comment on column listings.featured_source is
  'auto = free automatic new-listing feature. paid = bought promotion (future). A payments feature sets featured_until/featured_priority/featured_source on an existing row — it does not need new columns.';
comment on column listings.featured_priority is
  'Higher ranks first when more listings are eligible than there are featured slots. Auto = 0. Reserved for future paid tiers, e.g. 50 = "Featured", 100 = "Premium".';

-- Auto-feature every new listing for 24h for free, at default priority.
-- A future paid-promotion checkout flow overrides these columns after the
-- fact (or a seller upgrades an existing auto-feature to paid) — it does
-- not need to touch this trigger.
create or replace function set_default_featured_until()
returns trigger as $$
begin
  if new.featured_until is null then
    new.featured_until := coalesce(new.created_at, now()) + interval '24 hours';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_listing_insert_set_featured on listings;
create trigger on_listing_insert_set_featured
  before insert on listings
  for each row
  execute function set_default_featured_until();

-- Supports the featured_listings ranking directly (priority desc, then
-- recency desc) restricted to exactly the rows that could ever qualify —
-- without this, that query would sort every active listing on each call.
create index if not exists listings_featured_rank_idx
  on listings (featured_priority desc, created_at desc)
  where status = 'active' and availability = 'available';

-- Single source of truth for "how many featured slots exist at once" — a
-- view can't take a parameter, so this lives as its own function that
-- other objects call, rather than a magic number duplicated in several
-- places. Change the slot count here only.
create or replace function featured_slot_limit()
returns integer as $$
  select 12;
$$ language sql immutable;

-- "What's featured right now" — the single query the app needs. Ordered by
-- featured_priority desc (paid promotions win ties automatically once that
-- column starts being set to a nonzero value) then created_at desc (newest
-- auto-features win among themselves), capped at featured_slot_limit().
--
-- security_invoker means this view runs under the *querying user's* RLS,
-- not the view owner's — it can never surface a listing the caller
-- couldn't already see directly via the base table's own policies
-- (requires Postgres 15+; Supabase projects created after mid-2023 default
-- to this).
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

-- Cheap boolean check for a single listing (e.g. the listing detail page
-- deciding whether to show a "Featured" badge) without pulling the whole
-- ranked set. Marked stable, not immutable, since it depends on now() and
-- sibling rows.
create or replace function is_listing_featured(p_listing_id uuid)
returns boolean as $$
  select exists (
    select 1 from featured_listings where id = p_listing_id
  );
$$ language sql stable;
