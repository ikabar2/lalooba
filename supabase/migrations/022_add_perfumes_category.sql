-- ============================================================================
-- 022 — Add the Perfumes (العطور) category
--
-- listings.category has a CHECK constraint enumerating allowed keys; the app
-- now offers cat_perfumes, so the constraint must accept it BEFORE the new
-- code deploys (or perfume listings would fail to insert). Superset change:
-- every existing value remains valid. Idempotent drop-and-recreate.
-- ============================================================================

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
    'cat_clothing', 'cat_food', 'cat_crafts', 'cat_homemade',
    'cat_electronics', 'cat_perfumes', 'cat_cars', 'cat_barbershop',
    'cat_tax', 'cat_other'
  ));
