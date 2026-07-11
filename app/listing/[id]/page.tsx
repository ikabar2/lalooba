import ListingDetailBody from "@/components/ListingDetailBody";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchListingById } from "@/lib/listings-query";
import ProductJsonLd from "@/components/seo/ProductJsonLd";

// Fetch fresh so a just-posted listing is viewable immediately.
export const dynamic = "force-dynamic";

// Per-listing metadata: real title, description, canonical URL, and OG image
// (the first listing photo), so shared links and search snippets are rich.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchListingById(id);
  if (!listing) return { title: "Listing not found" };

  const currency = listing.country === "US" ? "USD" : "CAD";
  const priceLabel = listing.contactForPrice
    ? "Contact for price"
    : `${currency} ${listing.price}`;
  const title = listing.title.en;
  const description = `${priceLabel} · ${listing.city.en}, ${listing.country}. ${
    listing.title.en
  } on Lalooba — the community marketplace.`;
  const canonical = `/listing/${listing.id}`;
  const image = listing.images?.[0];

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Real DB listing only — no sample fallback in production.
  const listing = await fetchListingById(id);
  if (!listing) return notFound();

  const detectedCity = (await cookies()).get("lalooba-city")?.value ?? null;

  return (
    <>
      <ProductJsonLd listing={listing} />
      <Header detectedCity={detectedCity} />

      <main id="main-content" className="mx-auto max-w-4xl px-5 py-10">
        <ListingDetailBody listing={listing} />
      </main>

      <Footer />
    </>
  );
}
