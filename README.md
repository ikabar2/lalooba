# Lalooba — Next.js web

Starter web build using the navy/gold Gathering Circle branding.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or push this folder to a GitHub repo and import it directly at vercel.com/new —
Vercel auto-detects Next.js, no config needed.

## Setup

```bash
npm install
cp .env.local.example .env.local
# fill in your Supabase URL + anon key in .env.local
npm run dev
```

## Database setup

In the Supabase SQL editor (or `supabase db push` if using the CLI), run
`supabase/migrations/000_initial_schema.sql` — this is the entire schema in
one file: `profiles`, `listings`, `moderation_queue`, `conversations`,
`messages`, `jeeb_li_offers`, `jeeb_li_requests`, `reviews`, every RLS
policy, index, trigger, and the `listing-images` Storage bucket. Read the
comment blocks inside it — each section explains *why* a design decision
was made (e.g. why `status` and `availability` are two separate columns on
`listings`, or why `reviews` isn't gated behind a verified transaction),
not just what it creates.

### Starting over / resetting the schema

If you need to wipe the public schema and start clean (e.g. mid-setup
troubleshooting), run **`supabase/reset.sql`**, not a bare
`drop schema public cascade; create schema public;`. The bare version
looks complete but silently destroys the schema's default privilege
configuration along with the tables — afterward, `service_role` (and
`anon`/`authenticated`) get RLS-bypass but no actual base privilege on
anything created afterward, and every query fails with
**"permission denied for table X"**, which is not an RLS problem and won't
be fixed by any policy change. `reset.sql` drops/recreates the schema AND
restores the grants (including for tables created by migrations run
afterward), so a reset is safe to run on its own.

**Before running it**, find-and-replace `<PROJECT_REF>` near the bottom of
the file (in `trigger_fraud_check()`) with your actual Supabase project
reference, and set `app.settings.service_role_key` as a Postgres setting
via the dashboard (Database > Extensions > pg_net / Vault) — that's what
lets the fraud-check trigger call the Edge Function.

This file is meant for a **fresh** Supabase project only. If you already
ran the old incremental migrations (archived in `supabase/migrations_archive/`,
kept for reference/history, not meant to be run) against a project with
real data in it, don't also run this — it'll conflict with tables that
already exist.

**After** the base schema, run the incremental migrations in order:
- `001_avatars_bucket.sql` — the `avatars` Storage bucket + `profiles.avatar_url`, for profile photos.
- `002_marketplace_identity.sql` — separates auth identity from marketplace identity: adds `first_name`/`last_name` (private), `display_name` (public), and — importantly — **fixes the "violates foreign key constraint jeeb_li_offers_traveler_id_fkey" posting error**. That error means a user has no `profiles` row (their FK target). This migration adds the missing profiles INSERT policy, backfills a profile for every existing auth user that lacks one, and hardens the signup trigger. The app also self-heals at runtime via `lib/ensure-profile.ts`, called before every post — so even a user who somehow still lacks a profile gets one created the moment they try to post, rather than hitting the FK error.

## Seeding real demo data

Once the migration above has run, `scripts/seed.mjs` creates 6 real
seller accounts (via the Supabase Admin API, not a raw SQL insert into
`auth.users` — see the comment at the top of that file for why) and their
listings + reviews, replacing what `components/listings-data.ts` and
`components/sellers-data.ts` currently fake in the UI:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
npm run seed
```

Get both values from Settings > API in your Supabase project — the
**service role** key, not the anon key (creating a user as an admin
requires it). Never put this key in `.env.local`; it's only ever used here,
run once from your own machine, not inside the deployed app. Safe to
re-run — it looks up sellers by email first rather than creating
duplicates.

Once you're ready to point the actual pages at this instead of the sample
files, swap every `import { sampleListings } from "@/components/listings-data"`
(and the equivalent for `sellers-data.ts`) for a real Supabase query
matching the same shape, then delete both files — there's no flag to flip,
the sample files are dead code the moment nothing imports them.

## Jeeb Li — travel baggage sharing

Two clearly separated roles, never visually ambiguous which one you're in:

- **Traveler** — posts a trip at `/jeebli/post-trip` (teal role banner).
  Available weight is always shown in **teal**.
- **Sender** — requests space on an existing trip at `/jeebli/request/[id]`
  (gold role banner). Requested weight is always shown in **gold** — a
  deliberately different color from the traveler's teal "available" number,
  so the two are never confused on the same screen.

`/jeebli` lists all trips, sorted so trips landing in the visitor's own
detected country show first (same geo logic as the marketplace). The
homepage section under `#jeebli` shows a preview with "Post a trip" /
"See all trips" CTAs.

**Testing locally:** same caveat as messaging — the sample trips have
placeholder traveler IDs with no real account behind them, so clicking
"Request space" on a sample trip shows an honest error explaining this. To
test the real flow: sign up two test accounts, post a real trip as account A
via `/jeebli/post-trip`, then request space on it as account B — that
creates a real request row and a real conversation between the two of you.

## US/Canada-only signup

- `app/signup/page.tsx` requires a phone number and validates it client-side
  against the NANP (North American Numbering Plan) format before ever
  calling Supabase — gives a fast, friendly error rather than a round trip.
- The **real enforcement** is a CHECK constraint on `profiles.phone`
  (migration 007) — client-side validation alone is bypassable by anyone
  calling the Supabase API directly, so the database itself rejects any
  non-`+1` number regardless of how the request was made.
- Error shown for a rejected number: *"Lalooba is currently only available
  in the US and Canada, or not yet available in your region."*

## Upload security (size limits + the honest limit of MIME-type checking)

- `app/post/page.tsx` checks file size (5 MB max) and MIME type client-side
  before upload — fast feedback, not the real boundary.
- The **real enforcement** is on the `listing-images` Storage bucket itself
  (migration 008): `file_size_limit` and `allowed_mime_types` are set at
  the bucket level, so the Storage API rejects oversized or wrong-type
  files before they're ever written, even if someone skips the form
  entirely and calls the API directly.
- **What this does not fully solve**, on purpose stated plainly rather than
  implied: MIME-type checking validates the declared `Content-Type` header,
  not the actual byte content of the file — a disguised non-image payload
  with a spoofed image header would pass this check. The genuinely robust
  fix is server-side re-encoding (an Edge Function decodes and rewrites
  every uploaded image; a real image survives, a disguised payload fails
  to decode and gets rejected). That's flagged as a recommended next step
  in migration 008's comments rather than built — ask if you want it added.

## Right-click / DevTools deterrent

`components/DisableInspect.tsx`, mounted globally in `app/layout.tsx`,
disables the right-click context menu and common DevTools shortcuts
(F12, Ctrl+Shift+I/J/C, Ctrl+U).

**Read this before relying on it for anything:** this is a UX deterrent,
not security. DevTools opens via the browser's own menu regardless of this
component, page source and network requests remain fully inspectable, and
this does affect legitimate behavior too (right-click "open in new tab,"
copying text). Real protection for this app lives in RLS policies, the
fraud-check function, and never shipping secrets to the client — none of
which this component touches either way.

## Color & font rebrand

- **Navy** anchored at `#0B1220` (was `#042C53`) — darker base gives ≈20:1
  contrast for white text/icons on top of it, and reads cleanly in both
  bright daylight and low-light/night browsing. `navy-600` (`#44546E`) is
  the body-text-on-white shade, measuring ≈7.6:1 — comfortably exceeds
  WCAG AA (4.5:1).
- **Gold/accent** anchored at `#FF4500` (was `#EF9F27`). On white, `#FF4500`
  itself measures ≈3.4:1 — passes AA for large/bold text and UI elements
  (buttons, icons) but not small body text, so `gold-400` (`#CC3700`, same
  hue, ≈5.1:1) is used anywhere text needs to sit small on white.
- **Teal** is untouched — kept exactly as before specifically for
  verification badges and sign-up contexts, per instruction.
- **Arabic type** switched to Tajawal at weight 700 (`.arabic` class in
  `globals.css` forces this), replacing Noto Naskh Arabic — bolder and more
  geometric, intended to read clearly at a glance on both a bright phone
  screen and at night with reduced brightness.
- Two components had the old accent color hardcoded directly in inline SVG
  fills rather than via Tailwind class (`Logo.tsx`, `PromoBanner.tsx`) —
  both updated to the new hex directly, since Tailwind's generated classes
  don't reach inline `fill`/`stroke` SVG attributes.

## All footer pages now built

Every footer link now has a real page behind it, with genuinely useful
starter content rather than empty stubs — edit any of these directly, they're
plain Next.js pages, no special system required:

- `/about` — mission, what's on the platform, where it operates
- `/how-it-works` — numbered walkthrough (browse → signup → message → trust),
  plus Jeeb Li and posting-specific notes
- `/verification` — explains phone verification (live), ID verification
  (flagged as rolling out — no upload UI exists yet, written honestly
  rather than implying it's fully built), and trust score
- `/disputes` — how to report an issue, routed through `CONTACT_EMAIL`
  since no dedicated in-app dispute flow exists yet
- `/privacy` — grounded in the actual tables in `supabase/migrations/`
  (profiles, listings, messages, Jeeb Li, geo cookies) rather than generic
  boilerplate — still flagged as a starting template needing legal review
  before launch, not a finished legal document
- `/contact`, `/prohibited-items` — built in the previous pass

**Known remaining gap, not in scope for this pass:** the footer's "Jobs"
and "Interpreters" links still point at `#jobs` / `#institutions` anchors
that only resolve on the homepage — same situation Jeeb Li was in before
it got a real `/jeebli` page. Worth building real pages for these next.

## Search row translation fix + new categories

The header's search bar row (search placeholder, category dropdown, Search
button, +Post button, "Create free account", and the location fallback
text) was previously hardcoded English and did not translate when toggling
to Arabic — fixed by routing every string through `t()` with new keys in
`lib/translations.ts`. Category values themselves are now translation keys
too (`cat_clothing`, `cat_food`, etc.), so the dropdown options translate,
not just their surrounding label.

New categories added: Cars & Driving Instructor, Books/Arts/Gifts, Health &
Wellness, Other+. Note: the translation *keys* (`cat_barbershop`, `cat_tax`,
`cat_crafts`) intentionally kept their original internal names even after
their display labels were renamed (Barbershop → Books, Arts & Gifts / Tax
Filing → Health & Wellness / Crafts → Jewelry & Accessories) — they're also
the values stored in the database's `category` check constraint
(`011`/`000_initial_schema.sql`) and used in `?category=` URLs, so renaming
the key itself would mean a second migration just to rename an enum value.
Only the label changes; the identifier is stable on purpose.

## Editable footer content

`lib/footer-content.ts` is a single, clearly-commented file holding values
meant to be edited later without digging through component code:

- `CONTACT_EMAIL` — currently `support@lalooba.com`, used by `/contact`
- `PROHIBITED_ITEMS` — bilingual list of common items restricted across
  Canada (CBSA) and the US (USPS/customs), shown at `/prohibited-items`.
  **Not legal advice** — review with a lawyer before treating this as a
  final, binding policy; it's a reasonable starting point, not a finished
  legal document.

Both pages are now real routes the footer links to — they previously
pointed at `/contact` and `/prohibited-items` with no page behind either
URL. The other three footer links (About, How it works, Verification,
Disputes, Privacy policy) remain unbuilt placeholders, same as before —
only Contact and Prohibited items were in scope for this pass.

## Sign up / log in (real Supabase Auth)

- `app/signup/page.tsx`, `app/login/page.tsx` — real forms calling
  `supabase.auth.signUp` / `signInWithPassword`, not placeholders
- `app/auth/callback/route.ts` — handles the email confirmation link
- `middleware.ts` refreshes the session on every request (required by
  `@supabase/ssr`) — merged with the existing geo-detection logic, and
  guarded so a missing `.env.local` degrades gracefully instead of crashing
  the whole site
- Header shows the logged-in user's **display name** (`lib/user-display.ts`'s
  `getDisplayName()`), not their email — falls back to the email's local
  part only if no name is set. `app/account/page.tsx` is where a signed-in
  user edits their name and uploads a profile photo.

## Branded signup email

Supabase's default confirmation email says "Supabase Auth" with no
branding — `supabase/templates/confirmation.html` replaces it with a
Lalooba-branded version (logo, congratulatory copy using the name entered
at signup, a styled confirmation button).

**Local development** (`supabase start` / CLI): already wired up via
`supabase/config.toml` — nothing further to do.

**Hosted/production project**: `config.toml` only governs the local CLI —
it has no effect on a live Supabase project. To apply the same template
there:
1. Supabase Dashboard → your project → **Authentication → Email Templates**
2. Select **Confirm signup**
3. Paste the contents of `supabase/templates/confirmation.html` into the
   "Message body" field, and set the subject to "Confirm your Lalooba account"
4. Save

Same process applies if you later want to brand the other auth emails
(password reset, magic link, email change) — only "Confirm signup" is
templated here, matching what was asked for.

## Storage buckets (listing photos + avatars)

Two buckets, both created by migrations, both public-read/owner-write:
- `listing-images` — `supabase/migrations/000_initial_schema.sql`
- `avatars` — `supabase/migrations/001_avatars_bucket.sql`, added after the
  initial schema shipped (profile photo upload didn't exist yet when
  `000` was written) — `profiles.avatar_url` stores the resulting public URL

**If you see "Photo upload failed: Bucket not found"**: this means one of
the two migrations above hasn't actually been run against your Supabase
project yet — the bucket genuinely doesn't exist there. Run any missing
migrations (SQL editor or `supabase db push`), in filename order. The
front end already shows a friendlier message than the raw error
(`lib/error-messages.ts`) — but the fix for the underlying cause is
always "run the migration," not a code change.

## Messaging — how to test it locally before deploying

Real-time, RLS-protected messaging — not a UI mockup. To test it on
`localhost` you need **two real accounts**, since you can't message yourself:

1. Sign up account A at `/signup` (e.g. `test1@yourdomain.com`)
2. Confirm the email, then sign up account B with a different email
   (e.g. `test2@yourdomain.com`) — open this one in an incognito window so
   both sessions stay logged in simultaneously
3. While logged in as account A, go to `/messages/new` and enter account B's
   email — this creates a real conversation row and takes you to the thread
4. Switch to the incognito window (account B), go to `/messages`, open the
   same conversation, and reply — you should see it appear in account A's
   tab **without refreshing**, via Supabase Realtime

**Why not just click "Message seller" on a listing?** The sample listings on
the homepage have placeholder seller IDs with no real account behind them —
clicking that button will show an honest error explaining this, rather than
silently failing. `/messages/new` is the real way to test the underlying
system until real listings with real sellers exist in your database.

## Fraud-check Edge Function (rule-based, no ML model)

```bash
supabase functions deploy fraud-check
```

Flagged listings get `status = 'pending_review'` and land in the
`moderation_queue` table for manual review — nothing is auto-rejected,
only auto-routed for a human to check.

## Images — optimization & multi-photo listings

- `next.config.js` configures automatic AVIF/WebP delivery (browser gets
  whichever it supports, no manual conversion needed) and responsive device
  sizes, so a phone never downloads the same file size a desktop does
- Every listing now has `images: string[]` instead of a single `imageUrl` —
  sellers can upload up to 6 photos per listing via `/post`, with live
  preview thumbnails and per-photo remove before publishing
- Clicking the main photo on a listing's detail page opens a full-screen
  gallery (`components/ImageGallery.tsx`) — thumbnail strip, prev/next,
  keyboard arrows + Escape, swipeable-friendly on mobile
- Real uploads go to a `listing-images` Supabase Storage bucket (migration
  006) — public read, but write/delete restricted to the uploader via RLS
- `public/images/*.jpg` contains generated placeholder photos (multiple per
  sample listing) so the gallery and multi-photo card badge actually have
  something real to render out of the box, rather than broken image icons

## Mobile-first

- Explicit `viewport` export in `app/layout.tsx`
- The header's search bar, category dropdown, location pill, and Post
  button stack into separate full-width rows on phones and only flatten
  into a single inline row at the `sm` breakpoint and up (`sm:contents` is
  doing that flattening) — the previous version used `flex-wrap` with no
  mobile-specific stacking, which wrapped unpredictably below ~480px
- Auth links (Login/Sign up/Log out) move into the mobile dropdown menu on
  phones instead of competing for space in the already-tight top utility row
- Touch targets in the header are sized for thumbs on mobile (`py-3`) and
  tighten back down at `sm:` for mouse use

### Fixed: "app loads then goes white" on mobile

Root cause: there was **no error boundary anywhere in the app**
(`app/error.tsx` / `app/global-error.tsx` didn't exist). Any uncaught error
after the initial paint — a browser API missing on some mobile
browser/WebView, a failed fetch — unmounted the entire React tree with
nothing to catch it, which is exactly what "briefly loads, then white
screen" looks like from the outside. Fixed on two levels:

1. **Added the missing error boundaries** (`app/error.tsx`,
   `app/global-error.tsx`) — a safety net regardless of what throws, now
   and in the future: a real recovery screen instead of blank white.
2. **Fixed the specific unguarded browser APIs found in an audit**, each of
   which could throw uncaught on some mobile browser and previously had
   nothing catching it:
   - `ScrollReveal.tsx` — `IntersectionObserver` construction, used on
     nearly every homepage section
   - `lib/language-context.tsx` — `localStorage` access, runs on every page
   - `app/post/page.tsx` — `crypto.randomUUID()` (missing on non-HTTPS/some
     older WebViews); replaced with `lib/safe-random-id.ts`
   - `middleware.ts` — `decodeURIComponent()` on the geo-detected city header

## What's wired up

- `app/page.tsx` — homepage with search-first header, listings immediately
  visible (Kijiji-style — no large hero pushing inventory below the fold),
  module cards, promo banner, locked-guest banner, footer
- `app/marketplace/page.tsx` — search results page, wired to the header's
  search bar and category dropdown
- `app/post/page.tsx` — real listing creation form (wired to the header's
  "+ Post" button), inserts into `listings` and fires the fraud-check trigger
- `app/listing/[id]/page.tsx` — listing detail page with the "Message seller" button
- `components/Logo.tsx` — Gathering Circle mark + bilingual EN/AR wordmark, three sizes
- `components/ListingCard.tsx` + `ListingGrid.tsx` — shaped to match a future Supabase query,
  sample data included so the grid renders before the backend is connected

## Language toggle (EN / Arabic)

Real, working bilingual support — not just a static button:

- `lib/translations.ts` — every UI string in English and Arabic
- `lib/language-context.tsx` — React context that holds the current language, flips
  `<html dir="rtl">` automatically when Arabic is selected, and persists the choice in
  `localStorage` so it's remembered on the next visit
- Click "EN / عربي" in the header to toggle — the whole page re-renders in the new language
  and direction immediately, no page reload

To add more translated strings: add the key to both `en` and `ar` objects in
`lib/translations.ts`, then call `t("your_key")` in any client component.

## Geo-aware listings (US vs Canada)

The marketplace grid automatically shows listings from the visitor's own country first:

- `middleware.ts` reads Vercel's built-in `x-vercel-ip-country` / `x-vercel-ip-city` headers
  at the edge and stores them in cookies — no API call, no browser permission prompt
- `components/ListingGrid.tsx` (server component) reads those cookies and sorts the listing
  array so matching-country listings appear first
- `components/ListingGridClient.tsx` displays the result and a "near you, {city}" label

**Important — this only works once deployed to Vercel.** Your own laptop has no IP-based
geolocation, so `localhost` always falls back to Canada by default.

To test US-first sorting locally without deploying:

```
http://localhost:3000/?country=US
```

This simulates a US visitor so you can verify the sort order before pushing live.

## Next steps to connect real listings

1. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env vars (production)
2. Run the migrations in order (see above) against your real Supabase project
3. Replace the `sampleListings` array in `ListingGrid.tsx` with:
   ```ts
   const { data: listings } = await supabase
     .from("listings")
     .select("*, seller:profiles(full_name, phone_verified)")
     .eq("status", "active");
   ```
4. Replace `<img>` in `ListingCard.tsx` with `next/image` once real photo URLs come from Supabase Storage
