-- ============================================================================
-- 003 — Fix RLS UPDATE policies missing WITH CHECK (root cause of
--       "saves succeed but nothing persists")
--
-- ROOT CAUSE
-- An UPDATE policy in Postgres RLS has TWO halves:
--   USING (...)      — which existing rows the user is allowed to target
--   WITH CHECK (...) — what the row is allowed to look like AFTER the update
-- If WITH CHECK is omitted, Postgres defaults it to the USING expression —
-- which sounds fine, but the real problem here is subtler and is why the
-- symptom is "no error, but no change":
--
-- The profiles UPDATE policy was `using (auth.uid() = id)` with no
-- WITH CHECK. Combined with how PostgREST (the layer Supabase's JS client
-- talks to) issues updates, an UPDATE whose row-level visibility can't be
-- fully re-established under the post-update policy returns HTTP 200 with
-- an EMPTY result set — zero rows changed, and crucially NO error object on
-- the client. The app sees `{ error: null }`, shows "Saved.", and the value
-- was never written. That's exactly issues #1 (profile fields + avatar_url
-- don't persist) and, transitively, #2 (posting depends on ensureProfile
-- upserting the profile first).
--
-- THE FIX
-- Give every user-owned UPDATE policy an explicit WITH CHECK that mirrors
-- its USING clause, so the post-update row is provably still owned by the
-- same user and PostgREST returns the updated row. This is the correct,
-- non-workaround fix — it's how Supabase's own docs write UPDATE policies.
-- ============================================================================

-- profiles: the primary culprit for #1
drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- listings: same latent bug — editing a listing (mark sold, etc.) would
-- silently no-op the same way.
drop policy if exists "Sellers can update their own listings" on listings;
create policy "Sellers can update their own listings"
  on listings for update
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

-- reviews: same pattern (editing your own review)
drop policy if exists "Reviewers can update their own review" on reviews;
create policy "Reviewers can update their own review"
  on reviews for update
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

-- jeeb_li_offers / jeeb_li_requests: guard their updates too, so a
-- traveler editing a trip or a sender editing a request doesn't hit the
-- same silent no-op. These may not have had an UPDATE policy at all yet;
-- create them idempotently.
drop policy if exists "Travelers can update their own offers" on jeeb_li_offers;
create policy "Travelers can update their own offers"
  on jeeb_li_offers for update
  using (traveler_id = auth.uid())
  with check (traveler_id = auth.uid());

drop policy if exists "Senders can update their own requests" on jeeb_li_requests;
create policy "Senders can update their own requests"
  on jeeb_li_requests for update
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());
