import { sampleListings } from "@/components/listings-data";
import MarketplaceResults from "@/components/MarketplaceResults";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cookies } from "next/headers";
import type { TranslationKey } from "@/lib/translations";

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

  // Sample-data filtering for now — swap for a real Postgres query
  // (full-text search via to_tsvector/tsquery, plus `.eq("category", category)`
  // and `.eq("country", market)`) once real listings exist. Matches against
  // both languages so a search typed in Arabic finds the same results as the
  // same search typed in English, and category filtering works whichever
  // language built the URL (category values are always the English cat_*
  // key, never the label). `inactive` listings are excluded here the same
  // way the "Anyone can view active listings" RLS policy excludes them.
  const results = sampleListings.filter((l) => {
    if (l.availability === "inactive") return false;
    const matchesQuery = q
      ? l.title.en.toLowerCase().includes(q) || l.title.ar.toLowerCase().includes(q)
      : true;
    const matchesCategory = category && category !== "cat_all" ? l.category === category : true;
    const matchesMarket = market ? l.country === market : true;
    return matchesQuery && matchesCategory && matchesMarket;
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
