import { cookies } from "next/headers";
import { sampleListings } from "./listings-data";
import ListingGridClient from "./ListingGridClient";
import { fetchListings } from "@/lib/listings-query";
import type { Listing } from "./ListingCard";

export default async function ListingGrid() {
  // Set by middleware.ts from Vercel's IP geolocation headers.
  // On localhost these cookies won't exist yet — falls back to unsorted default order.
  const cookieStore = await cookies();
  const detectedCountry = cookieStore.get("lalooba-country")?.value ?? null;
  const detectedCity = cookieStore.get("lalooba-city")?.value ?? null;

  // REAL listings from the DB (the previously-missing read path), so posts
  // show on the homepage too. First page only — the homepage is a preview
  // grid, "See all" links to the full paginated marketplace.
  const { listings: dbListings } = await fetchListings({ page: 0 });

  // Sample listings still included during the demo phase. Mirrors the
  // "Anyone can view active listings" RLS policy — `inactive` never shows.
  const samplepublic = sampleListings.filter((l) => l.availability !== "inactive");

  // Real listings lead, then sample; de-dupe by id.
  const seen = new Set(dbListings.map((l) => l.id));
  const publicListings: Listing[] = [...dbListings, ...samplepublic.filter((l) => !seen.has(l.id))];

  // Sort: listings matching the visitor's detected country float to the top,
  // everything else keeps its original relative order (stable sort).
  const sortedListings = detectedCountry
    ? [...publicListings].sort((a, b) => {
        const aMatch = a.country === detectedCountry ? 0 : 1;
        const bMatch = b.country === detectedCountry ? 0 : 1;
        return aMatch - bMatch;
      })
    : publicListings;

  return <ListingGridClient listings={sortedListings} detectedCity={detectedCity} />;
}
