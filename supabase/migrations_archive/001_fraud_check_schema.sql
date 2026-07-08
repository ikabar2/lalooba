-- Base table — safe to run even if you already created this elsewhere;
-- IF NOT EXISTS means it won't touch an existing table's data.
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric not null,
  city text not null,
  country text not null,
  created_at timestamptz default now()
);

-- Columns the fraud-check function reads from profiles
alter table profiles
  add column if not exists phone_verified boolean default false,
  add column if not exists id_verified boolean default false,
  add column if not exists trust_score integer default 0,
  add column if not exists created_at timestamptz default now();

-- Columns the fraud-check function reads/writes on listings
alter table listings
  add column if not exists status text default 'active',
  add column if not exists flagged boolean default false,
  add column if not exists flag_reason text;

-- RLS on listings itself — without this, the anon key can read/write/delete
-- ANY listing directly via the API, regardless of what the app's UI allows.
-- This was the actual gap: a missing policy here is a real hole, not a
-- theoretical one — Supabase's own dashboard flags tables with RLS off.
alter table listings enable row level security;

create policy "Anyone can view active listings"
  on listings for select
  using (status = 'active' or seller_id = auth.uid());

create policy "Users can create their own listings"
  on listings for insert
  with check (seller_id = auth.uid());

create policy "Sellers can update their own listings"
  on listings for update
  using (seller_id = auth.uid());

create policy "Sellers can delete their own listings"
  on listings for delete
  using (seller_id = auth.uid());

create policy "Moderators can view all listings regardless of status"
  on listings for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'moderator')
    )
  );

-- Where flagged items land for a moderator to review
create table if not exists moderation_queue (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  seller_id uuid references profiles(id) on delete cascade,
  reasons text[] not null,
  risk_score integer not null,
  status text not null default 'pending', -- pending | approved | rejected
  created_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id)
);

create index if not exists moderation_queue_status_idx on moderation_queue(status);

-- RLS: only admins/moderators can read the queue, sellers never see their own flag reasons
alter table moderation_queue enable row level security;

create policy "Moderators can view queue"
  on moderation_queue for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'moderator')
    )
  );

create policy "Moderators can update queue"
  on moderation_queue for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'moderator')
    )
  );
