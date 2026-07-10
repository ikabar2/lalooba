-- ============================================================================
-- 012 — Remove the "Bank Transfers" category
--
-- Bank Transfer is being removed from the marketplace entirely. This:
--   • reassigns any existing cat_bank listings to cat_other (so the tighter
--     constraint below doesn't fail on existing rows), and
--   • rebuilds the category CHECK constraint without cat_bank.
--
-- The sdg_amount column (added in 008 for bank listings) is intentionally
-- LEFT in place but unused — dropping a column is destructive and offers no
-- benefit; a nullable, no-longer-written column is harmless and keeps this
-- migration safe and reversible.
-- ============================================================================

-- Move any existing bank-transfer listings to "Other" before tightening the
-- constraint, or the ALTER would fail on those rows.
update listings set category = 'cat_other' where category = 'cat_bank';

-- Rebuild the category constraint without cat_bank. Found dynamically so we
-- don't depend on the auto-generated constraint name.
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
    'cat_other'
  ));
