import MarketplaceResults from "@/components/MarketplaceResults";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cookies } from "next/headers";
import type { TranslationKey } from "@/lib/translations";
import { fetchListings } from "@/lib/listings-query";

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
  const category = (params.category as TranslationKey | undefined) ?? null;
  const market =
    params.market === "CA" || params.market === "US" ? params.market : null;

  // Real listings from the DB — the only source in production. Filtering is
  // done in SQL (indexed) for scale.
  const { listings: results } = await fetchListings({
    category,
    country: market,
    query: params.q ?? null,
    page: 0,
  });

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
