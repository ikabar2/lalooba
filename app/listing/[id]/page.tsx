import ListingDetailBody from "@/components/ListingDetailBody";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { fetchListingById } from "@/lib/listings-query";

// Fetch fresh so a just-posted listing is viewable immediately.
export const dynamic = "force-dynamic";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Real DB listing only — no sample fallback in production.
  const listing = await fetchListingById(id);
  if (!listing) return notFound();

  const detectedCity = (await cookies()).get("lalooba-city")?.value ?? null;

  return (
    <>
      <Header detectedCity={detectedCity} />

      <main className="mx-auto max-w-4xl px-5 py-10">
        <ListingDetailBody listing={listing} />
      </main>

      <Footer />
    </>
  );
}
