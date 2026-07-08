import type { Listing } from "@/components/ListingCard";

// Mirrors supabase/migrations/010_featured_listings.sql's `featured_listings`
// view and `featured_slot_limit()` function, field for field. Once real
// Supabase listings replace sample data, swap the *implementation* of
// getFeaturedListings for a `supabase.from("featured_listings").select()`
// call — callers (FeaturedListings.tsx, ListingCard's `featured` prop
// wiring) don't need to change, since the shape and ordering are already
// identical.
export const FEATURED_SLOT_LIMIT = 12;

function isEligible(listing: Listing): boolean {
  if (listing.availability !== "available") return false;
  if (!listing.featuredUntil) return false;
  return new Date(listing.featuredUntil).getTime() > Date.now();
}

// Same ordering as the SQL view: featured_priority desc, then created_at
// desc. Paid promotions (once that flow exists) just need a higher
// featuredPriority to win ties — this function doesn't change.
export function getFeaturedListings(
  listings: Listing[],
  limit: number = FEATURED_SLOT_LIMIT
): Listing[] {
  return [...listings]
    .filter(isEligible)
    .sort((a, b) => {
      const priorityDiff = (b.featuredPriority ?? 0) - (a.featuredPriority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, limit);
}

// For pages that already have the full listings array in hand (marketplace
// grid, seller profile) and just need a per-card boolean rather than
// recomputing the ranked set themselves.
export function getFeaturedIdSet(listings: Listing[], limit: number = FEATURED_SLOT_LIMIT): Set<string> {
  return new Set(getFeaturedListings(listings, limit).map((l) => l.id));
}
