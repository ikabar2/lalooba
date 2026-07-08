-- Avatars bucket ------------------------------------------------------------
-- Profile photo upload (app/account/page.tsx) had no bucket to write to —
-- only `listing-images` existed (000_initial_schema.sql). This is a
-- separate bucket, not a folder inside listing-images, because the two
-- have different lifecycle/size/policy needs: one avatar per user
-- (upsert-in-place, small file) vs. many photos per listing (append,
-- larger files, deleted when the listing is).
--
-- Public read (avatars are shown to everyone browsing listings/profiles,
-- same reasoning as listing photos); writes restricted to the file's own
-- owner. Path convention is `{user_id}/avatar.{ext}` — a fixed filename
-- per user (not a random one) so a new upload can overwrite the old avatar
-- in place via `upsert: true` from the client, instead of accumulating an
-- unbounded number of old avatar files nobody ever cleans up.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB — smaller than listing photos on purpose, this is a small square image
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view avatars" on storage.objects;
create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can replace their own avatar" on storage.objects;
create policy "Users can replace their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Profile photo URL — profiles didn't have anywhere to store this either.
alter table profiles
  add column if not exists avatar_url text;

comment on column profiles.avatar_url is
  'Public Storage URL from the avatars bucket. Null until the user uploads one — UI falls back to initials (see components/SellerProfileBody.tsx).';
