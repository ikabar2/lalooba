-- Without this, every table that references profiles(id) — including
-- conversations and messages — has nothing to point to, because signing up
-- via supabase.auth.signUp() only creates a row in auth.users, never in
-- your own profiles table automatically.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'user', -- user | moderator | admin
  phone_verified boolean default false,
  id_verified boolean default false,
  trust_score integer default 0,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view all profiles"
  on profiles for select
  using (true); -- profile basics (name, verified badge) are meant to be public

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();
