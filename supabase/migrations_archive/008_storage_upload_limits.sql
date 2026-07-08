-- The listing-images bucket had no size or type restriction at all — meaning
-- the storage API would accept literally any file, of any size, regardless
-- of what the post form's client-side <input accept="image/*"> suggested.
-- That attribute is a UI hint only; it does nothing to stop a request made
-- directly against the Storage API.
--
-- file_size_limit and allowed_mime_types are enforced by Supabase Storage
-- itself, before the file is even written to disk — this is the real
-- boundary, not the client-side checks in app/post/page.tsx.
update storage.buckets
set
  file_size_limit = 5242880, -- 5 MB per file
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'listing-images';

-- HONEST LIMITATION, worth knowing rather than assuming this is airtight:
-- allowed_mime_types checks the Content-Type header the uploader declares,
-- not the actual byte content of the file. Someone could rename a non-image
-- file and send it with a spoofed "image/jpeg" header, and this check alone
-- would not catch that. Size + MIME restriction blocks the large majority
-- of casual attack patterns (oversized files, obviously wrong file types,
-- executables with their real extension) but does not guarantee the file
-- is actually a valid, safely-decodable image.
--
-- The genuinely robust fix is server-side re-encoding: after upload, an
-- Edge Function decodes the image and writes a fresh re-encoded copy,
-- replacing the original. A real image decodes successfully and produces a
-- clean re-encoded file; a disguised non-image payload fails to decode at
-- all and gets rejected. This is meaningfully more work (an Edge Function
-- + an image library), so it's flagged here as the recommended next step
-- rather than built into this migration — ask if you want it built.
