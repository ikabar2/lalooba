import { sampleListings } from "@/components/listings-data";
import MarketplaceResults from "@/components/MarketplaceResults";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cookies } from "next/headers";
import type { TranslationKey } from "@/lib/translations";
import { fetchListings } from "@/lib/listings-query";
import type { Listing } from "@/components/ListingCard";

// Always fetch fresh on each request so a just-posted listing shows up
// immediately — no stale full-route cache hiding new posts.
export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: {
  // Next.js 15 made searchParams a Promise — must be awaited before use.
  searchParams: Promise<{ q?: string; category?: string; market?: string }>;
}) {
  const params = await searchParams;
  const detectedCity = (await cookies()).get("lalooba-city")?.value ?? null;
  const q = params.q?.toLowerCase() ?? "";
  const category = (params.category as TranslationKey | undefined) ?? null;
  const market =
    params.market === "CA" || params.market === "US" ? params.market : null;

  // REAL listings from the DB — this is the read path that was missing.
  // Posts insert into `listings`; this queries `listings`; so a new post now
  // appears here. Filtering is done in SQL (indexed) for scale.
  const { listings: dbListings } = await fetchListings({
    category,
    country: market,
    query: params.q ?? null,
    page: 0,
  });

  // Sample listings still shown so the marketplace isn't empty during the
  // demo phase. Filtered in-memory with the SAME predicates as the DB query
  // so results are consistent regardless of source. Once there's enough real
  // inventory, drop this block and show DB listings only.
  const sampleFiltered = sampleListings.filter((l) => {
    if (l.availability === "inactive") return false;
    const matchesQuery = q
      ? l.title.en.toLowerCase().includes(q) || l.title.ar.toLowerCase().includes(q)
      : true;
    const matchesCategory = category && category !== "cat_all" ? l.category === category : true;
    const matchesMarket = market ? l.country === market : true;
    return matchesQuery && matchesCategory && matchesMarket;
  });

  // Real listings first (newest genuine inventory leads), then sample data.
  // De-dupe by id defensively in case a real listing ever shares a sample id.
  const seen = new Set(dbListings.map((l) => l.id));
  const results: Listing[] = [...dbListings, ...sampleFiltered.filter((l) => !seen.has(l.id))];

  return (
    <>
      <Header detectedCity={detectedCity} />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <MarketplaceResults
          results={results}
          query={params.q ?? null}
          category={category}
          market={market}
        />
      </main>

      <Footer />
    </>
  );
}
