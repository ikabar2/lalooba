-- Bilingual content columns --------------------------------------------------
-- The front end has modeled listing title/city as bilingual objects
-- ({ en, ar }) since the very first components (ListingCard, listings-data.ts),
-- but the real `listings` table only ever had single `title`/`city` columns
-- (001_fraud_check_schema.sql). This closes that gap with two plain columns
-- per field rather than a jsonb blob — simpler to index and full-text
-- search, and consistent with every other column on this table.
--
-- Written to be safe even if real rows already exist: old `title`/`city`
-- values get copied into *_en as a starting point rather than left null,
-- and *_ar stays nullable — a listing is valid with just an English title;
-- forcing every seller to write both languages at listing-creation time
-- would be real friction on day one. The UI falls back to title_en when
-- title_ar is null.
alter table listings
  add column if not exists title_en text,
  add column if not exists title_ar text,
  add column if not exists city_en text,
  add column if not exists city_ar text;

update listings set title_en = title where title_en is null and title is not null;
update listings set city_en = city where city_en is null and city is not null;

alter table listings
  alter column title_en set not null,
  alter column city_en set not null;

alter table listings drop column if exists title;
alter table listings drop column if exists city;

comment on column listings.title_ar is
  'Nullable on purpose. UI falls back to title_en when null — see the '
  'bilingual Listing type in components/ListingCard.tsx.';

-- Category ---------------------------------------------------------------
-- Matches the cat_* translation keys in lib/translations.ts exactly. The
-- check constraint is the single source of truth both sides have to agree
-- with, so a typo'd category can never silently fail to filter or display.
alter table listings
  add column if not exists category text
    check (category in (
      'cat_clothing', 'cat_food', 'cat_crafts', 'cat_furniture',
      'cat_electronics', 'cat_cars', 'cat_barbershop', 'cat_tax', 'cat_other'
    ));

create index if not exists listings_category_idx on listings(category);

-- Currency -----------------------------------------------------------------
-- Previously implicit in the UI (derived from `country`: CA -> CAD,
-- US -> USD, see components/ListingCard.tsx). Made explicit here so a
-- seller can eventually price in a currency that doesn't match their own
-- country without a schema change — the UI's assumption becomes a stored
-- fact instead of logic baked into every place that renders a price.
alter table listings
  add column if not exists currency text not null default 'CAD'
    check (currency in ('CAD', 'USD'));

update listings set currency = 'USD' where country = 'US' and currency = 'CAD';

-- Full-text search -----------------------------------------------------------
-- 'simple' config (not 'english' or 'arabic') is a deliberate tradeoff: no
-- language-specific stemming (searching "بيت" won't also match "بيوت" the
-- way real Arabic stemming would), but it's the only config that treats
-- English and Arabic text the same way without installing a separate
-- Arabic search dictionary. Reasonable for launch; revisit if search
-- recall quality becomes a real complaint.
alter table listings
  add column if not exists search_vector tsvector
    generated always as (
      to_tsvector('simple', coalesce(title_en, '') || ' ' || coalesce(title_ar, ''))
    ) stored;

create index if not exists listings_search_idx on listings using gin(search_vector);

-- Composite index for the actual browse/filter query pattern this app
-- uses (category + country + availability, newest first) — without it,
-- MarketplaceResults' filtered queries sort every matching row on every
-- request instead of walking a pre-sorted index.
create index if not exists listings_browse_idx
  on listings (category, country, availability, created_at desc);
