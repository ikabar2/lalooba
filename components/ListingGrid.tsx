import { cookies } from "next/headers";
import { sampleListings } from "./listings-data";
import ListingGridClient from "./ListingGridClient";

export default async function ListingGrid() {
  // Set by middleware.ts from Vercel's IP geolocation headers.
  // On localhost these cookies won't exist yet — falls back to unsorted default order.
  const cookieStore = await cookies();
  const detectedCountry = cookieStore.get("lalooba-country")?.value ?? null;
  const detectedCity = cookieStore.get("lalooba-city")?.value ?? null;

  // Mirrors the "Anyone can view active listings" RLS policy in
  // 009_listing_availability_status.sql — `inactive` listings (seller took
  // them down) never show in public browse, even in sample data.
  const publicListings = sampleListings.filter((l) => l.availability !== "inactive");

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
