import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/components/ListingCard";
import type { TranslationKey } from "@/lib/translations";

// ============================================================================
// Marketplace feed data access
//
// ROOT CAUSE THIS FIXES: the marketplace + homepage feeds rendered the static
// `sampleListings` array and never queried the `listings` table. So posts
// saved correctly to the DB but could never appear in the feed — the feed
// simply wasn't reading from the place posts are written. This module is the
// missing read path: it queries real listings, adapts each DB row to the UI's
// `Listing` shape, and is built for scale from the start (indexed filters,
// keyset-friendly ordering, pagination, bounded page size).
// ============================================================================

// Page size for the feed. Kept modest so each request stays cheap at 20k+
// listings; the UI paginates rather than pulling everything.
export const FEED_PAGE_SIZE = 24;

export type FeedFilters = {
  category?: TranslationKey | null;
  country?: "CA" | "US" | null;
  query?: string | null;
  page?: number; // 0-based
};

// Shape of the row we select — a subset of columns plus the joined seller
// display fields. Selecting only what the card needs keeps payloads small.
type ListingRow = {
  id: string;
  seller_id: string;
  title_en: string;
  title_ar: string | null;
  price: number;
  currency: string;
  city_en: string;
  city_ar: string | null;
  country: string;
  category: string | null;
  images: string[] | null;
  availability: string;
  created_at: string;
  featured_until: string | null;
  featured_priority: number | null;
  seller: {
    display_name: string | null;
    full_name: string | null;
    id_verified: boolean | null;
  } | null;
};

// Adapt a DB row to the bilingual UI `Listing` shape. The DB stores
// title_en/title_ar as separate columns; the UI wants { en, ar }. When the
// Arabic value is null we fall back to the English one so Arabic mode still
// renders real text instead of a blank — matching the bi() accessor's intent.
function rowToListing(row: ListingRow): Listing {
  const sellerName = row.seller?.display_name || row.seller?.full_name || "Member";
  return {
    id: row.id,
    title: { en: row.title_en, ar: row.title_ar || row.title_en },
    price: row.price,
    city: { en: row.city_en, ar: row.city_ar || row.city_en },
    country: row.country === "US" ? "US" : "CA",
    images: row.images && row.images.length > 0 ? row.images : [],
    category: (row.category as TranslationKey) ?? "cat_other",
    sellerId: row.seller_id ?? "",
    seller: {
      name: sellerName,
      avatarInitials: sellerName.slice(0, 2).toUpperCase(),
      verified: !!row.seller?.id_verified,
    },
    availability: (row.availability as Listing["availability"]) ?? "available",
    createdAt: row.created_at,
    featuredUntil: row.featured_until,
    featuredPriority: row.featured_priority ?? undefined,
  };
}

// Fetch a page of real listings from the DB, filtered + ordered to match the
// browse index (category, country, availability, created_at desc). Returns
// both the listings and whether another page exists, for pagination.
//
// Degrades gracefully: if Supabase isn't configured or the query errors, it
// returns an empty result rather than throwing, so the feed can fall back to
// sample data and never white-screens on a data-layer hiccup.
export async function fetchListings(
  filters: FeedFilters = {}
): Promise<{ listings: Listing[]; hasMore: boolean; error: string | null }> {
  const page = Math.max(0, filters.page ?? 0);
  const from = page * FEED_PAGE_SIZE;
  const to = from + FEED_PAGE_SIZE - 1;

  try {
    const supabase = await createClient();

    // Only public, sellable rows: active moderation status, not inactive.
    // These predicates line up with the partial/browse indexes so the query
    // stays index-served at scale instead of scanning the table.
    let q = supabase
      .from("listings")
      .select(
        `id, seller_id, title_en, title_ar, price, currency, city_en, city_ar,
         country, category, images, availability, created_at,
         featured_until, featured_priority,
         seller:profiles ( display_name, full_name, id_verified )`,
        { count: "exact" }
      )
      .eq("status", "active")
      .neq("availability", "inactive");

    if (filters.category && filters.category !== "cat_all") {
      q = q.eq("category", filters.category);
    }
    if (filters.country) {
      q = q.eq("country", filters.country);
    }
    if (filters.query && filters.query.trim() !== "") {
      // Search both language title columns. ilike is fine for now; the
      // schema also has a GIN search_vector index for upgrading to full-text
      // (websearch_to_tsquery) without a schema change when volume warrants.
      const term = `%${filters.query.trim()}%`;
      q = q.or(`title_en.ilike.${term},title_ar.ilike.${term}`);
    }

    // Featured first, then newest — same ordering intent as the featured
    // ranking view, served by listings_featured_rank_idx / browse index.
    q = q
      .order("featured_priority", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, error, count } = await q;

    if (error) {
      console.error("[fetchListings] query failed:", error.message);
      return { listings: [], hasMore: false, error: error.message };
    }

    const listings = (data as unknown as ListingRow[]).map(rowToListing);
    const hasMore = count !== null ? to + 1 < count : listings.length === FEED_PAGE_SIZE;

    return { listings, hasMore, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown feed error";
    console.error("[fetchListings] threw:", message);
    return { listings: [], hasMore: false, error: message };
  }
}
