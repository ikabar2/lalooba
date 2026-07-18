import { cookies } from "next/headers";
import Header from "@/components/Header";
import PromoBanner from "@/components/PromoBanner";
import FeaturedListings from "@/components/FeaturedListings";
import CategoryIconBar from "@/components/CategoryIconBar";
import ModuleCards from "@/components/ModuleCards";
import LockedBanner from "@/components/LockedBanner";
import ListingGrid from "@/components/ListingGrid";
import ListingGridSkeleton from "@/components/ListingGridSkeleton";
import { Suspense } from "react";
import JeebLiSection from "@/components/JeebLiSection";
import Footer from "@/components/Footer";
import { getActiveMemberCount, getActiveListingCount } from "@/lib/stats";
import { fetchListings } from "@/lib/listings-query";
import { fetchJeebLiOffers } from "@/lib/jeebli-query";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Read once here (Server Component) and pass down — avoids each client
  // component needing its own cookie-parsing logic.
  const detectedCity = (await cookies()).get("lalooba-city")?.value ?? null;
  const [{ count: activeMembers, isLive }, { count: activeListings }] = await Promise.all([
    getActiveMemberCount(),
    getActiveListingCount(),
  ]);

  // Real listings for the featured strip (getFeaturedListings picks the
  // currently-featured subset). ListingGrid does its own fetch for the main
  // grid so it can apply the visitor's country sort.
  const { listings } = await fetchListings({ page: 0 });
  // If the feed came back empty, log exactly why to the server logs so an
  // empty deployment is diagnosable in one look (env vars, migrations, RLS,
  // or a status-pipeline issue) rather than a silent blank grid.
  if (listings.length === 0) {
    const { diagnoseFeed } = await import("@/lib/listings-query");
    console.error("[home] Feed is empty. Diagnosis:", await diagnoseFeed());
  }
  const jeebLiOffers = await fetchJeebLiOffers();

  return (
    <>
      <Header detectedCity={detectedCity} />
      <PromoBanner activeMembers={activeMembers} activeMembersIsLive={isLive} activeListings={activeListings} />
      {/* Orientation before content: a first-time visitor needs "what can I
          browse here" before "here's what's hot" — categories are
          navigation, Featured is content, and navigation earns the first
          slot the same way the header nav/search does. */}
      <CategoryIconBar />
      <FeaturedListings listings={listings} />
      {/* Listings sit immediately below search — no large hero pushing them
          below the fold, matching the "posts visible first" reference. */}
      <Suspense fallback={<ListingGridSkeleton />}>
        <ListingGrid />
      </Suspense>
      <JeebLiSection offers={jeebLiOffers} />
      <ModuleCards />
      <LockedBanner />
      <Footer />
    </>
  );
}
