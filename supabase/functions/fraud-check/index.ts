// supabase/functions/fraud-check/index.ts
//
// Rule-based fraud flagging for new listings. Runs as a Supabase Edge Function
// (Deno runtime), called right after a listing is inserted — either via a
// Postgres trigger + pg_net, or directly from your Next.js API route after
// the insert succeeds. No ML model, no training data needed, no third-party
// API calls — everything it needs is already in your own database.
//
// Deploy: supabase functions deploy fraud-check
// Invoke:  POST /functions/v1/fraud-check  body: { "listing_id": "<uuid>" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Tune these without redeploying logic changes elsewhere — they're the only
// "knobs" a non-engineer moderator lead might reasonably want adjusted.
const RULES = {
  NEW_ACCOUNT_DAYS: 3, // account younger than this = "new"
  HIGH_VALUE_PRICE: 300, // CAD — listings above this get extra scrutiny
  RAPID_LISTING_COUNT: 5, // more than this many listings...
  RAPID_LISTING_WINDOW_HOURS: 1, // ...within this many hours = suspicious burst
  AUTO_FLAG_THRESHOLD: 50, // risk_score >= this auto-routes to moderation_queue
};

type Listing = {
  id: string;
  title: string;
  price: number;
  seller_id: string;
  city: string;
  country: string;
  created_at: string;
};

type Profile = {
  id: string;
  phone_verified: boolean;
  id_verified: boolean;
  trust_score: number;
  created_at: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { listing_id } = await req.json();
  if (!listing_id) {
    return new Response(JSON.stringify({ error: "listing_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Service role key — this function runs server-side only, never expose this
  // key to the client. Edge Functions are the correct place for it.
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, title, price, seller_id, city, country, created_at")
    .eq("id", listing_id)
    .single<Listing>();

  if (listingError || !listing) {
    return new Response(JSON.stringify({ error: "Listing not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: seller, error: sellerError } = await supabase
    .from("profiles")
    .select("id, phone_verified, id_verified, trust_score, created_at")
    .eq("id", listing.seller_id)
    .single<Profile>();

  if (sellerError || !seller) {
    return new Response(JSON.stringify({ error: "Seller profile not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const reasons: string[] = [];
  let riskScore = 0;

  // --- Rule 1: new account ---
  const accountAgeDays =
    (Date.now() - new Date(seller.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const isNewAccount = accountAgeDays < RULES.NEW_ACCOUNT_DAYS;
  if (isNewAccount) {
    riskScore += 20;
    reasons.push(`New account (${accountAgeDays.toFixed(1)} days old)`);
  }

  // --- Rule 2: high-value listing ---
  const isHighValue = listing.price >= RULES.HIGH_VALUE_PRICE;
  if (isHighValue) {
    riskScore += 15;
    reasons.push(`High-value listing ($${listing.price})`);
  }

  // --- Rule 3: no verification at all ---
  if (!seller.phone_verified) {
    riskScore += 25;
    reasons.push("Phone not verified");
  }
  if (!seller.id_verified) {
    riskScore += 10;
    reasons.push("Government ID not verified");
  }

  // --- Rule 4: compounding risk — new + unverified + high value together ---
  // This is intentionally nonlinear: each factor alone is normal behavior for
  // a legitimate new user, but all three together is the actual risk pattern.
  if (isNewAccount && isHighValue && !seller.phone_verified) {
    riskScore += 30;
    reasons.push("New, unverified account posting a high-value item — compounding risk");
  }

  // --- Rule 5: rapid listing burst from the same seller ---
  const windowStart = new Date(
    Date.now() - RULES.RAPID_LISTING_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { count: recentListingCount } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", listing.seller_id)
    .gte("created_at", windowStart);

  if ((recentListingCount ?? 0) > RULES.RAPID_LISTING_COUNT) {
    riskScore += 25;
    reasons.push(
      `${recentListingCount} listings posted within ${RULES.RAPID_LISTING_WINDOW_HOURS}h — possible bulk/bot posting`
    );
  }

  // --- Rule 6: trust score floor ---
  // A seller with a very low or negative trust score (past disputes, reports)
  // gets flagged regardless of how this specific listing looks.
  if (seller.trust_score < 0) {
    riskScore += 20;
    reasons.push(`Negative trust score (${seller.trust_score})`);
  }

  const shouldFlag = riskScore >= RULES.AUTO_FLAG_THRESHOLD;

  if (shouldFlag) {
    await supabase
      .from("listings")
      .update({ flagged: true, flag_reason: reasons.join("; "), status: "pending_review" })
      .eq("id", listing.id);

    await supabase.from("moderation_queue").insert({
      listing_id: listing.id,
      seller_id: seller.id,
      reasons,
      risk_score: riskScore,
      status: "pending",
    });
  }

  return new Response(
    JSON.stringify({
      listing_id: listing.id,
      risk_score: riskScore,
      flagged: shouldFlag,
      reasons,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
