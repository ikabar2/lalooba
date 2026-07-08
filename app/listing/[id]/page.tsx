import { sampleListings } from "@/components/listings-data";
import ListingDetailBody from "@/components/ListingDetailBody";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Falls back to sample data so this page works before Supabase listings
  // exist — swap for a real `supabase.from("listings").select(...)` query
  // once your listings table has real rows.
  const listing = sampleListings.find((l) => l.id === id);
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
