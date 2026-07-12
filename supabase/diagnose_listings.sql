-- ============================================================================
-- DIAGNOSE + FIX: "listings not showing"
-- Run these one block at a time in the Supabase SQL Editor.
-- ============================================================================

-- 1. How many listings exist in total?
select count(*) as total_listings from listings;
--   • 0  → the table is empty (wrong project, or nothing was ever posted).
--   • >0 → keep going.

-- 2. Break down by the two columns the feed filters on.
select status, availability, count(*)
from listings
group by status, availability
order by count(*) desc;
--   The public feed shows rows where  status = 'active'  AND
--   availability <> 'inactive'. If your rows have some OTHER status
--   (e.g. 'pending_review', or null), that's why the feed is empty.

-- 3. Confirm the columns the app selects actually exist on this database.
select column_name
from information_schema.columns
where table_name = 'listings'
  and column_name in ('contact_for_price','featured_until','featured_priority','status','availability');
--   If 'contact_for_price' is missing → migration 011 never ran. Run
--   migrations 011–016 in order, then recheck.

-- 4. Check the public read grant/policy lets anon read listings.
select has_table_privilege('anon', 'listings', 'SELECT') as anon_can_read_listings;
--   Should be true. If false, run:  grant select on listings to anon, authenticated;

-- ============================================================================
-- FIX (only if step 2 showed rows with a non-'active' status that SHOULD be
-- visible): make existing listings active. Safe to run repeatedly.
-- ============================================================================
update listings
set status = 'active'
where status is distinct from 'active';

-- Re-run step 2 afterwards — you should now see rows with status='active'.
-- The app also has a runtime fallback that shows non-'active' rows, but
-- setting them active is the correct durable fix.
