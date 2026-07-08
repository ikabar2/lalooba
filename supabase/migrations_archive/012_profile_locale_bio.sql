-- The seller profile page (app/seller/[id]/page.tsx, shipped against sample
-- data in sellers-data.ts) already displays city, country, and a bio for
-- every seller — none of which profiles had a column for yet. Bilingual for
-- the same reason listings.title_en/title_ar are
-- (011_listings_i18n_category_currency.sql): a profile is valid with just
-- one language filled in, so both _ar columns stay nullable.
alter table profiles
  add column if not exists city_en text,
  add column if not exists city_ar text,
  add column if not exists country text check (country in ('CA', 'US')),
  add column if not exists bio_en text,
  add column if not exists bio_ar text;
