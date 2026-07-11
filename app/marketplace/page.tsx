import MarketplaceResults from "@/components/MarketplaceResults";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import type { TranslationKey } from "@/lib/translations";
import { translations } from "@/lib/translations";
import { fetchListings } from "@/lib/listings-query";

// Always fetch fresh on each request so a just-posted listing shows up
// immediately — no stale full-route cache hiding new posts.
export const dynamic = "force-dynamic";

// Human-readable category label from the English translation table.
function categoryLabel(key: string | null): string | null {
  if (!key || key === "cat_all") return null;
  const en = translations.en as Record<string, string>;
  return en[key] ?? null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; market?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const catLabel = categoryLabel(params.category ?? null);
  const market = params.market === "CA" || params.market === "US" ? params.market : null;
  const marketLabel = market === "US" ? "United States" : market === "CA" ? "Canada" : null;

  // Build a descriptive, unique title per filter combination.
  const parts = [catLabel ?? "Marketplace"];
  if (marketLabel) parts.push(`in ${marketLabel}`);
  const title = parts.join(" ");
  const description = catLabel
    ? `Browse ${catLabel.toLowerCase()} listings${
        marketLabel ? ` in ${marketLabel}` : ""
      } on Lalooba — the free community marketplace.`
    : "Browse community listings on Lalooba — buy and sell locally in English and Arabic.";

  // Canonical: only include the category in the canonical URL (the primary
  // faceted dimension). A free-text search (?q=) is noindex-friendly — we
  // point its canonical at the clean category/marketplace URL to avoid
  // thin/duplicate search-result pages competing in the index.
  const canonical = params.category
    ? `/marketplace?category=${params.category}`
    : "/marketplace";

  return {
    title,
    description,
    alternates: { canonical },
    // Free-text search result pages: keep them out of the index (thin,
    // near-infinite variations) but still followable so listings get crawled.
    robots: params.q ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function MarketplacePage({
  searchParams,
}: {
  // Next.js 15 made searchParams a Promise — must be awaited before use.
  searchParams: Promise<{ q?: string; category?: string; market?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const detectedCity = cookieStore.get("lalooba-city")?.value ?? null;
  const category = (params.category as TranslationKey | undefined) ?? null;
  const market =
    params.market === "CA" || params.market === "US" ? params.market : null;

  // Real listings from the DB — the only source in production. Filtering is
  // done in SQL (indexed) for scale.
  const { listings: fetched } = await fetchListings({
    category,
    country: market,
    query: params.q ?? null,
    page: 0,
  });

  // "Your country first, the other below": when the user hasn't explicitly
  // filtered to one market, stable-sort so listings from their detected or
  // preferred country lead, with the other country's after. The cookie
  // already reflects the precedence chain (saved preference > GPS > IP).
  const userCountry = cookieStore.get("lalooba-country")?.value ?? null;
  const results =
    !market && (userCountry === "CA" || userCountry === "US")
      ? [...fetched].sort((a, b) => {
          const aMatch = a.country === userCountry ? 0 : 1;
          const bMatch = b.country === userCountry ? 0 : 1;
          return aMatch - bMatch;
        })
      : fetched;

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
