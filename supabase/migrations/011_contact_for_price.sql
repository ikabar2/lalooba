-- ============================================================================
-- 011 — "Contact for Price" option for listings
--
-- Lets a seller publish a listing WITHOUT a fixed numeric price, inviting
-- buyers to message them to negotiate/ask. Applies to every category,
-- including Bank Transfer.
--
-- Two changes:
--   • contact_for_price boolean flag (default false) — when true, the UI
--     hides the numeric price and shows a "Contact for price" call to action.
--   • price becomes NULLABLE — a contact-for-price listing has no price to
--     store. A CHECK keeps the data honest: either it's contact-for-price,
--     or it has a non-negative price (you can't have neither).
-- ============================================================================

alter table listings
  add column if not exists contact_for_price boolean not null default false;

-- Drop the NOT NULL on price so contact-for-price rows can omit it.
alter table listings
  alter column price drop not null;

-- Integrity: a listing must EITHER be contact-for-price, OR carry a real
-- (non-negative) price. Never neither. Found/dropped dynamically so we don't
-- depend on a constraint name that may not exist yet.
do $$
declare
  c_name text;
begin
  select con.conname into c_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'listings'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%contact_for_price%';

  if c_name is not null then
    execute format('alter table listings drop constraint %I', c_name);
  end if;
end $$;

alter table listings
  add constraint listings_price_or_contact
  check (contact_for_price = true or (price is not null and price >= 0));

comment on column listings.contact_for_price is
  'When true, the listing has no fixed price; buyers are prompted to contact the seller. price may be null in this case.';
