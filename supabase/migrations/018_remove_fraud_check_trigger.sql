-- ============================================================================
-- 018 — Remove the broken fraud-check trigger (fixes listings not showing +
--        the "<PROJECT_REF>.supabase.co" error)
--
-- WHAT WENT WRONG
-- 000_initial_schema created trigger_fraud_check(), which fires AFTER INSERT
-- on listings and does an HTTP POST via pg_net to:
--     https://<PROJECT_REF>.supabase.co/functions/v1/fraud-check
-- The <PROJECT_REF> placeholder was never replaced and the fraud-check Edge
-- Function was never deployed, so every listing insert fired a request to an
-- invalid URL (the "<PROJECT_REF>" string you saw in the error). That
-- pipeline was also the thing meant to move listings to a visible state, so
-- with it broken, listings could stay unshown.
--
-- FIX
-- Remove the trigger and function. Listings then insert cleanly and rely on
-- the column default (status = 'active'), which is exactly what the public
-- feed looks for — so new posts are visible immediately. Moderation can be
-- reintroduced later as a proper, deployed Edge Function with the real
-- project ref and key in Vault; until then, no broken external call runs on
-- the insert path.
-- ============================================================================

drop trigger if exists on_listing_created on listings;
drop function if exists trigger_fraud_check();

-- Safety net: make sure any existing rows left in a non-visible state by the
-- old broken pipeline become visible. Only touches rows that aren't already
-- active and weren't explicitly taken down by their seller.
update listings
set status = 'active'
where status is distinct from 'active'
  and availability is distinct from 'inactive';
