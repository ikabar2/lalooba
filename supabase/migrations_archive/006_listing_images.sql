-- listings.images was missing entirely from the original schema — the post
-- form had nowhere to actually store uploaded photo URLs. Fixing that here.
alter table listings
  add column if not exists images text[] not null default '{}';

-- Storage bucket for listing photos. Public read (anyone can view a photo
-- on an active listing, matching the "browse without signing up" decision),
-- but writes are restricted to the authenticated owner of the folder.
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- Files are stored under a path like `{user_id}/{filename}` — these
-- policies check that the first path segment matches the uploader's own
-- auth uid, so one seller can never overwrite or delete another's photos.
create policy "Anyone can view listing images"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "Users can upload their own listing images"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own listing images"
  on storage.objects for delete
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
