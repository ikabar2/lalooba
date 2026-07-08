import { cookies } from "next/headers";
import ListingGridClient from "./ListingGridClient";
import { fetchListings } from "@/lib/listings-query";

export default async function ListingGrid() {
  // Set by middleware.ts from Vercel's IP geolocation headers.
  const cookieStore = await cookies();
  const detectedCountry = cookieStore.get("lalooba-country")?.value ?? null;
  const detectedCity = cookieStore.get("lalooba-city")?.value ?? null;

  // Real listings from the DB — first page for the homepage preview grid.
  const { listings: publicListings } = await fetchListings({ page: 0 });

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
