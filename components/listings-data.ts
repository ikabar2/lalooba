// ============================================================================
// SAMPLE / DEMO DATA — replace, don't merge with, real data.
//
// Every page that reads `sampleListings` (ListingGrid, MarketplaceResults,
// FeaturedListings, SellerProfileBody, the listing detail page) imports it
// directly from this file. Once real listings exist in Supabase, the fix is
// NOT to delete individual fake rows below — it's to replace the import.
// Swap `import { sampleListings } from "./listings-data"` for a real query
// (e.g. `const { data: listings } = await supabase.from("listings").select("*")`)
// everywhere it's used, matching the `Listing` type in ListingCard.tsx, then
// delete this file. There's no toggle/flag to flip — the moment nothing
// imports from here anymore, it's dead code and safe to remove.
// ============================================================================

import { Listing } from "./ListingCard";
export { countryNames } from "@/lib/country-names";

// Sample data shaped exactly like a future Supabase query result.
// title/city are bilingual objects, not plain strings — this is what lets
// switching to Arabic translate the actual marketplace content, not just
// the surrounding UI chrome. In production, store title_en/title_ar (or a
// jsonb column) on the listings table the same way.
//
// category is one of the cat_* keys from translations.ts, and sellerId
// links to a Seller record in sellers-data.ts (name/avatarInitials/verified
// stay duplicated on `seller` for cheap card rendering without a join, the
// same way a denormalized read-model column would in Postgres).
//
// availability/createdAt/featuredUntil/featuredSource/featuredPriority
// mirror migrations 009 (sold/inactive state) and 010 (featured system) —
// see lib/featured.ts for the ranking logic that reads these fields.
// featuredUntil values below are hand-picked relative to "now" so the demo
// data shows a realistic mix: a couple of listings freshly posted (still
// featured), a couple past their 24h window (no longer featured), and one
// marked sold (featured or not, sold always shows the "Sold" ribbon).
//
// images is an array — sellers can upload multiple photos of the same item,
// the first one is the cover photo shown on cards, and clicking it on the
// detail page opens the full gallery. Real listings store this as a
// `text[]` column (see migration 006) pointing at Supabase Storage URLs.
// Replace with:
// const { data: listings } = await supabase.from("listings")
//   .select("*, seller:profiles(*)")
export const sampleListings: Listing[] = [
  {
    id: "1",
    title: { en: "Sudanese Thobe — white cotton", ar: "ثوب سوداني — قطن أبيض" },
    price: 45,
    city: { en: "Scarborough", ar: "سكاربورو" },
    country: "CA",
    images: ["/images/thobe-1.jpg", "/images/thobe-2.jpg", "/images/thobe-3.jpg"],
    category: "cat_clothing",
    sellerId: "s1",
    seller: { name: "Karim M.", avatarInitials: "KM", verified: true },
    availability: "available",
    createdAt: "2026-07-02T08:00:00Z", // 4h old — still within the 24h auto-feature window
    featuredUntil: "2026-07-03T08:00:00Z",
    featuredSource: "auto",
    featuredPriority: 0,
  },
  {
    id: "2",
    title: { en: "Jelabiya — blue & gold", ar: "جلابية — أزرق وذهبي" },
    price: 65,
    city: { en: "Mississauga", ar: "ميسيساغا" },
    country: "CA",
    images: ["/images/jelabiya-1.jpg", "/images/jelabiya-2.jpg", "/images/jelabiya-3.jpg"],
    category: "cat_clothing",
    sellerId: "s2",
    seller: { name: "Fatima A.", avatarInitials: "FA", verified: true },
    availability: "available",
    createdAt: "2026-07-01T20:00:00Z", // 16h old — still featured
    featuredUntil: "2026-07-02T20:00:00Z",
    featuredSource: "auto",
    featuredPriority: 0,
  },
  {
    id: "3",
    title: { en: "Homemade Ful Medames — jar", ar: "فول مدمس منزلي — برطمان" },
    price: 12,
    city: { en: "Brampton", ar: "برامبتون" },
    country: "CA",
    images: ["/images/ful-1.jpg", "/images/ful-2.jpg"],
    category: "cat_food",
    sellerId: "s3",
    seller: { name: "Hana A.", avatarInitials: "HA", verified: true },
    availability: "available",
    createdAt: "2026-06-29T10:00:00Z", // posted days ago — 24h window long expired
    featuredUntil: "2026-06-30T10:00:00Z",
    featuredSource: "auto",
    featuredPriority: 0,
  },
  {
    id: "4",
    title: { en: "Kisra bread with lamb stew", ar: "خبز كسرة مع طاجن لحم" },
    price: 18,
    city: { en: "North York", ar: "نورث يورك" },
    country: "CA",
    images: ["/images/kisra-1.jpg", "/images/kisra-2.jpg"],
    category: "cat_food",
    sellerId: "s4",
    seller: { name: "Youssef S.", avatarInitials: "YS", verified: false },
    availability: "sold", // demo of the "Sold" ribbon — stays visible, no longer featured
    createdAt: "2026-06-30T09:00:00Z",
    featuredUntil: "2026-07-01T09:00:00Z",
    featuredSource: "auto",
    featuredPriority: 0,
  },
  {
    id: "5",
    title: { en: "Hand-carved wooden serving tray", ar: "صينية تقديم خشبية محفورة يدويًا" },
    price: 38,
    city: { en: "Seattle", ar: "سياتل" },
    country: "US",
    images: ["/images/tray-1.jpg", "/images/tray-2.jpg", "/images/tray-3.jpg"],
    // cat_furniture, not cat_crafts — cat_crafts was renamed to "Jewelry &
    // Accessories" and a wooden serving tray doesn't fit that anymore. See
    // the category-rename note in lib/translations.ts.
    category: "cat_furniture",
    sellerId: "s5",
    seller: { name: "Mona O.", avatarInitials: "MO", verified: true },
    availability: "available",
    createdAt: "2026-07-02T10:00:00Z", // 2h old — freshest listing, ranks first when featured
    featuredUntil: "2026-07-03T10:00:00Z",
    featuredSource: "auto",
    featuredPriority: 0,
  },
  {
    id: "6",
    title: { en: "Embroidered headscarf — coral", ar: "طرحة مطرزة — كورال" },
    price: 22,
    city: { en: "Spokane", ar: "سبوكان" },
    country: "US",
    images: ["/images/headscarf-1.jpg", "/images/headscarf-2.jpg"],
    category: "cat_clothing",
    sellerId: "s6",
    seller: { name: "Nadia S.", avatarInitials: "NS", verified: false },
    availability: "available",
    createdAt: "2026-06-25T09:00:00Z", // older listing — no longer featured
    featuredUntil: "2026-06-26T09:00:00Z",
    featuredSource: "auto",
    featuredPriority: 0,
  },
];
