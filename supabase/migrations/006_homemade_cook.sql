-- ============================================================================
-- 006 — Homemade Cook category + its listing fields
--
-- Replaces the Furniture category with "Homemade Cook" (home cooks selling
-- prepared homemade food) and adds the fields that kind of listing needs
-- beyond a normal item:
--   • quantity      — how many portions/servings are available
--   • fulfillment   — pickup, delivery, or both
-- Sold-out status is already covered by the existing `availability` column
-- (available | sold | inactive), so no new column is needed for that —
-- a cook marks a dish 'sold' when it's gone.
--
-- These columns are nullable so they only apply to listings that use them
-- (a clothing listing leaves them null); the app only surfaces the
-- quantity/fulfillment UI for the Homemade Cook category.
-- ============================================================================

-- 1. New columns (nullable — only homemade-cook listings populate them)
alter table listings
  add column if not exists quantity integer check (quantity is null or quantity >= 0),
  add column if not exists fulfillment text
    check (fulfillment is null or fulfillment in ('pickup', 'delivery', 'both'));

comment on column listings.quantity is
  'Portions/servings available — used by the Homemade Cook category. Null for listing types where it does not apply.';
comment on column listings.fulfillment is
  'How the buyer receives the item: pickup | delivery | both. Used by Homemade Cook; null for others.';

-- 2. Update the category CHECK constraint: drop cat_furniture, add
--    cat_homemade (and keep cat_bank from migration 005). Found dynamically
--    so we don't depend on the auto-generated constraint name.

-- FIRST: reassign any existing listings that use the category being removed.
-- The new constraint forbids 'cat_furniture', so any row still holding it
-- would make the ALTER fail with "check constraint is violated by some row".
-- We move them to 'cat_other' rather than 'cat_homemade' — an existing
-- furniture listing is NOT homemade food, so 'other' is the honest bucket;
-- the seller can recategorize it. If you'd rather map them elsewhere, change
-- the target here before running.
update listings set category = 'cat_other' where category = 'cat_furniture';

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
    and pg_get_constraintdef(con.oid) ilike '%category%';

  if c_name is not null then
    execute format('alter table listings drop constraint %I', c_name);
  end if;
end $$;

alter table listings
  add constraint listings_category_check
  check (category in (
    'cat_clothing', 'cat_food', 'cat_homemade', 'cat_crafts',
    'cat_electronics', 'cat_cars', 'cat_barbershop', 'cat_tax',
    'cat_bank', 'cat_other'
  ));
