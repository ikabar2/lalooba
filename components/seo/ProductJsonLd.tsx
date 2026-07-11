import JsonLd from "./JsonLd";
import { getSiteUrl } from "@/lib/site-url";
import type { Listing } from "@/components/ListingCard";

// Product + BreadcrumbList structured data for a single listing page. Product
// makes the listing eligible for rich results (price, availability, image);
// BreadcrumbList mirrors the on-page breadcrumb trail for Google.
export default function ProductJsonLd({ listing }: { listing: Listing }) {
  const base = getSiteUrl();
  const url = `${base}/listing/${listing.id}`;
  const currency = listing.country === "US" ? "USD" : "CAD";

  const availability =
    listing.availability === "sold"
      ? "https://schema.org/SoldOut"
      : listing.availability === "inactive"
        ? "https://schema.org/Discontinued"
        : "https://schema.org/InStock";

  const product: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title.en,
    url,
    image: listing.images?.length ? listing.images : undefined,
    category: listing.category,
    ...(listing.seller?.name
      ? { brand: { "@type": "Brand", name: listing.seller.name } }
      : {}),
  };

  // Only attach an Offer with a price when there's a real numeric price —
  // contact-for-price listings have no price to advertise.
  if (!listing.contactForPrice && typeof listing.price === "number" && listing.price > 0) {
    product.offers = {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: currency,
      availability,
      url,
    };
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: "Marketplace", item: `${base}/marketplace` },
      { "@type": "ListItem", position: 3, name: listing.title.en, item: url },
    ],
  };

  return (
    <>
      <JsonLd data={product} />
      <JsonLd data={breadcrumb} />
    </>
  );
}
