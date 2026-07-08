-- ============================================================================
-- 008 — Seller-entered SDG amount for bank-transfer listings
--
-- For bank-transfer / remittance listings, the seller states how many
-- Sudanese Pounds (SDG) they give for their posted local price. This is the
-- SELLER'S OWN rate — not an auto-conversion. We store their entered number
-- so the listing displays exactly what they're offering
-- (e.g. "CAD 100 → SDG 155,000").
--
-- Nullable: only bank-transfer listings use it; every other category leaves
-- it null. The app only shows/collects it for category = 'cat_bank'.
-- ============================================================================

alter table listings
  add column if not exists sdg_amount numeric
    check (sdg_amount is null or sdg_amount >= 0);

comment on column listings.sdg_amount is
  'For bank-transfer (cat_bank) listings: the SDG amount the seller gives for the posted local price. Seller-entered, not auto-converted. Null for other categories.';
