-- ============================================================================
-- 004 — Feed query performance indexes (scale: 20k+ listings)
--
-- The marketplace/homepage feed now queries the listings table (previously
-- it only rendered static sample data — the root cause of new posts never
-- appearing). fetchListings() in lib/listings-query.ts issues:
--
--   where status = 'active' and availability <> 'inactive'
--     [optional] and category = $1
--     [optional] and country  = $2
--     [optional] and (title_en ilike $3 or title_ar ilike $3)
--   order by featured_priority desc nulls last, created_at desc
--   limit 24 offset N
--
-- 000_initial_schema already ships listings_browse_idx (category, country,
-- availability, created_at desc) and a featured partial index, which cover
-- the filtered cases well. This migration adds two things they don't:
--   1. An index matching the DEFAULT feed (no category/country filter) —
--      the most common query — ordered exactly how the feed sorts.
--   2. Trigram indexes so the ilike title search stays index-served instead
--      of scanning every row once there are tens of thousands of listings.
-- All idempotent; safe to re-run.
-- ============================================================================

-- 1. Default-feed ordering index. Partial (only publicly-visible rows) so it
--    stays small and matches the feed's status/availability predicates. This
--    serves the common "browse everything, newest+featured first" query
--    without a category/country filter, which the composite browse index
--    (category-leading) can't serve efficiently.
create index if not exists listings_feed_default_idx
  on listings (featured_priority desc, created_at desc)
  where status = 'active' and availability <> 'inactive';

-- 2. Trigram indexes for case-insensitive title search (ilike '%term%').
--    Without these, an ilike with a leading wildcard forces a full scan.
--    pg_trgm lets Postgres index-serve substring matches in both languages.
create extension if not exists pg_trgm;

create index if not exists listings_title_en_trgm_idx
  on listings using gin (title_en gin_trgm_ops);

create index if not exists listings_title_ar_trgm_idx
  on listings using gin (title_ar gin_trgm_ops);

-- Note on pagination at scale: fetchListings uses range() (limit/offset),
-- which is fine to a few thousand rows per filter. If a single filter ever
-- routinely pages tens of thousands deep, switch that path to keyset
-- pagination (where (created_at, id) < ($last_created, $last_id)) using the
-- same ordering columns above — the indexes here already support it. No
-- schema change needed for that upgrade.
