-- ============================================================================
-- 005 — Add "Bank Transfers" (تحويلات بنكية) category
--
-- The listings.category column has a CHECK constraint enumerating the valid
-- cat_* values. Adding a new category in the app (translations, icons, post
-- form) isn't enough on its own: an insert with category = 'cat_bank' would
-- be rejected by the old constraint. This migration replaces the constraint
-- to include cat_bank.
--
-- Bank Transfers / remittances are a core need for the Sudanese diaspora
-- (sending money home, hawala-style transfers), so it earns a top-level
-- category rather than living under "Other".
--
-- Idempotent: drops the existing constraint by name (if present) before
-- re-adding the expanded one. The constraint name follows Postgres's
-- default {table}_{column}_check convention for an inline column CHECK.
-- ============================================================================

-- Drop whatever CHECK constraint currently governs listings.category,
-- looked up dynamically — an inline `column text check (...)` gets an
-- auto-generated name that's *usually* listings_category_check but isn't
-- guaranteed, so we find it by definition rather than assuming the name.
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
    'cat_clothing', 'cat_food', 'cat_crafts', 'cat_furniture',
    'cat_electronics', 'cat_cars', 'cat_barbershop', 'cat_tax',
    'cat_bank', 'cat_other'
  ));
