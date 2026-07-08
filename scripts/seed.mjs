#!/usr/bin/env node
// Seeds 6 demo sellers + their listings + reviews against a real Supabase
// project — the database equivalent of components/listings-data.ts and
// components/sellers-data.ts, which is what powers the site until this has
// been run (see the "SAMPLE / DEMO DATA" banner at the top of those files).
//
// Users are created through the Admin API, not a raw SQL insert into
// auth.users. auth.users has internal columns (instance_id,
// confirmation_token, aud, encrypted_password via pgcrypto, ...) that vary
// across Supabase/Postgres versions — hand-inserting them wrong is exactly
// the kind of fragile, version-specific mistake that produces an opaque
// runtime error. The Admin API is the officially supported way to do this
// and stays stable across versions.
//
// Safe to re-run: looks up each seller by email first and skips creating
// it again, so running this twice never produces duplicate accounts.
//
// Usage:
//   SUPABASE_URL=https://your-project-ref.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
//   node scripts/seed.mjs
//
// Get both from your Supabase project: Settings > API. The service role
// key is required — creating users and inserting rows as an admin bypasses
// RLS on purpose, since this is a one-time setup script, not app code.
// NEVER put this key in .env.local or any NEXT_PUBLIC_ variable — it only
// ever runs here, from your own machine or CI, never inside the Next.js app.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
    "Find both under Settings > API in your Supabase project, then run:\n\n" +
    "  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.mjs\n"
  );
  process.exit(1);
}

// Runtime sanity check: decode the JWT we were handed and confirm it's
// actually the service_role key BEFORE doing anything. This catches the
// most common seed failure — the anon key passed by mistake, or an env
// var set in a different terminal so this one is empty/stale — and fails
// with a clear message instead of a cryptic "permission denied" 20 lines
// later.
try {
  const payload = JSON.parse(Buffer.from(SERVICE_ROLE_KEY.split(".")[1], "base64").toString());
  if (payload.role !== "service_role") {
    console.error(
      `\n✗ The key in SUPABASE_SERVICE_ROLE_KEY has role "${payload.role}", not "service_role".\n` +
      `  Seeding needs the SERVICE ROLE (secret) key — the one under\n` +
      `  Settings > API > Project API keys, on the "service_role" row (click reveal).\n` +
      `  The "anon" key won't work: it's blocked by row-level security.\n`
    );
    process.exit(1);
  }
  console.log(`Using service_role key (project: ${payload.ref ?? "unknown"}).`);
} catch {
  console.error("\n✗ SUPABASE_SERVICE_ROLE_KEY doesn't look like a valid Supabase key (couldn't decode it).\n");
  process.exit(1);
}

// Force the service-role key as BOTH the apikey and the Authorization
// bearer token, and disable all session/auth persistence. Without the
// explicit global Authorization header, the client can end up sending a
// different token than intended in a plain Node context — which surfaces
// as "permission denied for table ..." even when the correct key was
// passed. persistSession:false / autoRefreshToken:false keep this
// one-shot script from touching or reusing any ambient auth state.
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  },
});

// Dev/demo accounts only — never a real login path. Admin-created users
// don't need a memorable password since nobody signs in as them normally.
const DEMO_PASSWORD = "Lalooba-Seed-Demo-2026!";

// Mirrors components/sellers-data.ts exactly, minus the string ids ("s1"…)
// which get replaced by whatever real UUID Supabase assigns on creation.
const SELLERS = [
  {
    email: "karim.demo@lalooba.dev",
    full_name: "Karim M.",
    phone: "+14165550101",
    city_en: "Scarborough", city_ar: "سكاربورو", country: "CA",
    bio_en: "Selling gently used thobes and men's wear. Usually replies within a few hours.",
    bio_ar: "أبيع ثيابًا وملابس رجالية مستعملة بحالة جيدة. أرد عادة خلال ساعات قليلة.",
    id_verified: true, phone_verified: true, trust_score: 92,
  },
  {
    email: "fatima.demo@lalooba.dev",
    full_name: "Fatima A.",
    phone: "+19055550102",
    city_en: "Mississauga", city_ar: "ميسيساغا", country: "CA",
    bio_en: "Handmade jelabiyas and occasion wear, made to order or ready-to-ship.",
    bio_ar: "جلابيات مصنوعة يدويًا وملابس مناسبات، حسب الطلب أو جاهزة للشحن.",
    id_verified: true, phone_verified: true, trust_score: 97,
  },
  {
    email: "hana.demo@lalooba.dev",
    full_name: "Hana A.",
    phone: "+19055550103",
    city_en: "Brampton", city_ar: "برامبتون", country: "CA",
    bio_en: "Home-cooked Sudanese staples made fresh to order — ful, kisra, and more.",
    bio_ar: "أطباق سودانية منزلية طازجة حسب الطلب — فول، كسرة، وغيرها.",
    id_verified: true, phone_verified: true, trust_score: 88,
  },
  {
    email: "youssef.demo@lalooba.dev",
    full_name: "Youssef S.",
    phone: "+14165550104",
    city_en: "North York", city_ar: "نورث يورك", country: "CA",
    bio_en: "New to Lalooba — occasional home-cooked meals for pickup.",
    bio_ar: "عضو جديد في لالوبا — وجبات منزلية بين الحين والآخر للاستلام.",
    id_verified: false, phone_verified: true, trust_score: 40,
  },
  {
    email: "mona.demo@lalooba.dev",
    full_name: "Mona O.",
    phone: "+12065550105",
    city_en: "Seattle", city_ar: "سياتل", country: "US",
    bio_en: "Hand-carved wood crafts and home decor from Sudan.",
    bio_ar: "منتجات خشبية محفورة يدويًا وديكورات منزلية من السودان.",
    id_verified: true, phone_verified: true, trust_score: 90,
  },
  {
    email: "nadia.demo@lalooba.dev",
    full_name: "Nadia S.",
    phone: "+15095550106",
    city_en: "Spokane", city_ar: "سبوكان", country: "US",
    bio_en: "Embroidered scarves and small accessories, made in small batches.",
    bio_ar: "طرح مطرزة وإكسسوارات صغيرة، تُصنع بكميات محدودة.",
    id_verified: false, phone_verified: true, trust_score: 55,
  },
];

async function findExistingUserByEmail(email) {
  // No direct "get user by email" admin call in supabase-js — list + find.
  // Fine at this scale (6 seed users); would need pagination past ~50 users.
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email === email) ?? null;
}

async function ensureSeller(seller) {
  let user = await findExistingUserByEmail(seller.email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: seller.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: seller.full_name, phone: seller.phone },
    });
    if (error) throw new Error(`Creating ${seller.email}: ${error.message}`);
    user = data.user;
  }

  // The on_auth_user_created trigger (000_profiles_and_signup_trigger.sql,
  // extended by 007_phone_north_america_only.sql) already created a
  // matching profiles row with full_name + phone. Fill in the rest —
  // fields 011/012's migrations added that the trigger doesn't set.
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      // display_name is the public marketplace identity (migration 002);
      // full_name kept in sync for the legacy fallback path.
      display_name: seller.full_name,
      first_name: seller.full_name.split(" ")[0] ?? null,
      last_name: seller.full_name.split(" ").slice(1).join(" ") || null,
      city_en: seller.city_en,
      city_ar: seller.city_ar,
      country: seller.country,
      bio_en: seller.bio_en,
      bio_ar: seller.bio_ar,
      id_verified: seller.id_verified,
      phone_verified: seller.phone_verified,
      trust_score: seller.trust_score,
    })
    .eq("id", user.id);
  if (updateError) throw new Error(`Updating profile for ${seller.email}: ${updateError.message}`);

  return { ...seller, id: user.id };
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}
function hoursFromNow(h) {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
}

// Mirrors components/listings-data.ts exactly, keyed by seller email so
// each listing attaches to the right just-created seller id below. Image
// paths point at the placeholder photos already bundled in public/images/
// and served by the Next.js app itself — not Supabase Storage. Real
// listings created through the actual /post form use Storage instead (see
// 006_listing_images.sql); these are demo-only stand-ins so seeded
// listings render real photos immediately without needing anything
// uploaded first.
function buildListings(sellersByEmail) {
  return [
    {
      seller_id: sellersByEmail["karim.demo@lalooba.dev"],
      title_en: "Sudanese Thobe — white cotton", title_ar: "ثوب سوداني — قطن أبيض",
      price: 45, city_en: "Scarborough", city_ar: "سكاربورو", country: "CA", currency: "CAD",
      category: "cat_clothing", images: ["/images/thobe-1.jpg", "/images/thobe-2.jpg", "/images/thobe-3.jpg"],
      availability: "available", created_at: hoursAgo(4), featured_until: hoursFromNow(20),
    },
    {
      seller_id: sellersByEmail["fatima.demo@lalooba.dev"],
      title_en: "Jelabiya — blue & gold", title_ar: "جلابية — أزرق وذهبي",
      price: 65, city_en: "Mississauga", city_ar: "ميسيساغا", country: "CA", currency: "CAD",
      category: "cat_clothing", images: ["/images/jelabiya-1.jpg", "/images/jelabiya-2.jpg", "/images/jelabiya-3.jpg"],
      availability: "available", created_at: hoursAgo(16), featured_until: hoursFromNow(8),
    },
    {
      seller_id: sellersByEmail["hana.demo@lalooba.dev"],
      title_en: "Homemade Ful Medames — jar", title_ar: "فول مدمس منزلي — برطمان",
      price: 12, city_en: "Brampton", city_ar: "برامبتون", country: "CA", currency: "CAD",
      category: "cat_food", images: ["/images/ful-1.jpg", "/images/ful-2.jpg"],
      availability: "available", created_at: hoursAgo(70), featured_until: hoursAgo(46),
    },
    {
      seller_id: sellersByEmail["youssef.demo@lalooba.dev"],
      title_en: "Kisra bread with lamb stew", title_ar: "خبز كسرة مع طاجن لحم",
      price: 18, city_en: "North York", city_ar: "نورث يورك", country: "CA", currency: "CAD",
      category: "cat_food", images: ["/images/kisra-1.jpg", "/images/kisra-2.jpg"],
      availability: "sold", created_at: hoursAgo(48), featured_until: hoursAgo(24),
    },
    {
      seller_id: sellersByEmail["mona.demo@lalooba.dev"],
      title_en: "Hand-carved wooden serving tray", title_ar: "صينية تقديم خشبية محفورة يدويًا",
      price: 38, city_en: "Seattle", city_ar: "سياتل", country: "US", currency: "USD",
      // cat_furniture, not cat_crafts — cat_crafts was renamed to "Jewelry
      // & Accessories" and a wooden serving tray doesn't fit that anymore.
      category: "cat_furniture", images: ["/images/tray-1.jpg", "/images/tray-2.jpg", "/images/tray-3.jpg"],
      availability: "available", created_at: hoursAgo(2), featured_until: hoursFromNow(22),
    },
    {
      seller_id: sellersByEmail["nadia.demo@lalooba.dev"],
      title_en: "Embroidered headscarf — coral", title_ar: "طرحة مطرزة — كورال",
      price: 22, city_en: "Spokane", city_ar: "سبوكان", country: "US", currency: "USD",
      category: "cat_clothing", images: ["/images/headscarf-1.jpg", "/images/headscarf-2.jpg"],
      availability: "available", created_at: hoursAgo(190), featured_until: hoursAgo(166),
    },
  ];
}

// Reviews cross-reference the 6 seeded sellers as each other's reviewers —
// simpler than inventing a second batch of throwaway buyer accounts just
// to attach reviews to, and still exercises the real reviews table/RLS/
// unique-per-reviewer constraint end to end.
function buildReviews(sellersByEmail) {
  const order = [
    "karim.demo@lalooba.dev", "fatima.demo@lalooba.dev", "hana.demo@lalooba.dev",
    "youssef.demo@lalooba.dev", "mona.demo@lalooba.dev", "nadia.demo@lalooba.dev",
  ];
  return order.map((email, i) => {
    const reviewerEmail = order[(i + 1) % order.length]; // next seller in the ring reviews this one
    return {
      seller_id: sellersByEmail[email],
      reviewer_id: sellersByEmail[reviewerEmail],
      rating: 5,
      comment: "Great to deal with, exactly as described.",
    };
  });
}

async function main() {
  console.log("Creating/updating sellers…");
  const sellersByEmail = {};
  for (const seller of SELLERS) {
    const created = await ensureSeller(seller);
    sellersByEmail[seller.email] = created.id;
    console.log(`  ✓ ${seller.full_name} → ${created.id}`);
  }

  console.log("\nSeeding listings…");
  const sellerIds = Object.values(sellersByEmail);
  // upsert needs a conflict target, and listings has no natural unique key
  // to seed against — delete-then-insert is simpler and correct: reruns
  // reset these sellers' demo listings to a clean, consistent state
  // instead of silently duplicating them (which upsert(onConflict: "id")
  // would do here, since no id is supplied on insert).
  const { error: deleteListingsError } = await supabase
    .from("listings")
    .delete()
    .in("seller_id", sellerIds);
  if (deleteListingsError) throw new Error(`Clearing old demo listings: ${deleteListingsError.message}`);

  const { error: listingsError } = await supabase
    .from("listings")
    .insert(buildListings(sellersByEmail));
  if (listingsError) throw new Error(`Seeding listings: ${listingsError.message}`);
  console.log("  ✓ 6 listings");

  console.log("\nSeeding reviews…");
  // reviews DOES have a real unique constraint to upsert against
  // (reviews_one_per_reviewer on (seller_id, reviewer_id), 013_reviews.sql).
  const { error: reviewsError } = await supabase
    .from("reviews")
    .upsert(buildReviews(sellersByEmail), { onConflict: "seller_id,reviewer_id" });
  if (reviewsError) throw new Error(`Seeding reviews: ${reviewsError.message}`);
  console.log("  ✓ 6 reviews");

  console.log("\nDone. Visit /marketplace and /seller/<id> to see real data.");
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
