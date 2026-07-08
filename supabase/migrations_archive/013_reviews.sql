-- Reviews ----------------------------------------------------------------
-- Trust model, stated plainly rather than left implicit: this is NOT gated
-- behind a verified transaction, because there's no checkout/order system
-- to gate against — marketplace and Jeeb Li deals are arranged through
-- messaging and happen off-platform. Instead: one review per
-- (reviewer, seller) pair, must be authenticated, can't review yourself.
-- That's a pragmatic MVP trust model, not the strongest possible one —
-- revisit if/when there's an actual transaction record to require instead
-- of just an account.
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid references listings(id) on delete set null, -- optional context, not required
  rating integer not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz default now(),

  constraint reviews_no_self_review check (seller_id <> reviewer_id),
  constraint reviews_one_per_reviewer unique (seller_id, reviewer_id)
);

create index if not exists reviews_seller_idx on reviews(seller_id);

alter table reviews enable row level security;

create policy "Anyone can read reviews"
  on reviews for select
  using (true); -- reviews are public trust signals, same as listings themselves

create policy "Authenticated users can write their own review"
  on reviews for insert
  with check (reviewer_id = auth.uid());

create policy "Reviewers can edit their own review"
  on reviews for update
  using (reviewer_id = auth.uid());

create policy "Reviewers can delete their own review"
  on reviews for delete
  using (reviewer_id = auth.uid());

-- Convenience aggregate for the seller profile page (average rating +
-- count) — one query instead of recomputing avg/count client-side or
-- duplicating the aggregation in every place that needs it.
create or replace view seller_rating_summary
  with (security_invoker = true) as
select
  seller_id,
  round(avg(rating)::numeric, 1) as average_rating,
  count(*) as review_count
from reviews
group by seller_id;
