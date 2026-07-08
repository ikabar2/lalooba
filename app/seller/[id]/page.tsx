import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { sampleSellers, sampleReviews, type Seller } from "@/components/sellers-data";
import { sampleListings } from "@/components/listings-data";
import { createClient } from "@/lib/supabase/server";
import { fetchListingsBySeller } from "@/lib/listings-query";
import SellerProfileBody from "@/components/SellerProfileBody";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Adapts a real `profiles` row into the Seller shape SellerProfileBody
// renders — bridging the sample-data phase and real data without the
// component needing to know which source it came from. Bilingual fields get
// the same value in both languages (a real profile stores one city string,
// not a translated pair yet); reviews/other-listings come back empty until
// those tables have real rows, which the component already handles.
function realProfileToSeller(row: {
  id: string;
  display_name: string | null;
  full_name: string | null;
  city_en: string | null;
  country: string | null;
  bio_en: string | null;
  id_verified: boolean | null;
  created_at: string | null;
}): Seller {
  const name = row.display_name || row.full_name || "Member";
  const city = row.city_en || "";
  return {
    id: row.id,
    name,
    avatarInitials: name.slice(0, 2).toUpperCase(),
    verified: !!row.id_verified,
    city: { en: city, ar: city },
    country: row.country === "US" ? "US" : "CA",
    activeSince: row.created_at
      ? new Date(row.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : "",
    rating: 0,
    reviewCount: 0,
    bio: { en: row.bio_en ?? "", ar: row.bio_en ?? "" },
  };
}

export default async function SellerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Sample seller (ids like "s1") first — keeps the demo profiles working.
  const sampleSeller = sampleSellers.find((s) => s.id === id);

  let seller: Seller | null = sampleSeller ?? null;
  let reviews = sampleSeller ? sampleReviews.filter((r) => r.sellerId === sampleSeller.id) : [];
  let otherListings = sampleSeller
    ? sampleListings.filter((l) => l.sellerId === sampleSeller.id && l.availability !== "inactive")
    : [];

  // Not a sample id — try a real profiles row (this is what makes a real
  // signed-up user's public profile, linked from /account, actually
  // resolve). Degrades gracefully if Supabase isn't configured.
  if (!seller) {
    try {
      const supabase = await createClient();
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id, display_name, full_name, city_en, country, bio_en, id_verified, created_at")
        .eq("id", id)
        .maybeSingle();
      if (profileRow) {
        seller = realProfileToSeller(profileRow);
        reviews = [];
        // Show the seller's real posted listings on their profile.
        otherListings = await fetchListingsBySeller(id);
      }
    } catch {
      // Supabase not configured (.env.local absent) — fall through to 404.
    }
  }

  if (!seller) return notFound();

  const detectedCity = (await cookies()).get("lalooba-city")?.value ?? null;

  return (
    <>
      <Header detectedCity={detectedCity} />

      <main className="mx-auto max-w-5xl px-5 py-10">
        <SellerProfileBody seller={seller} reviews={reviews} otherListings={otherListings} />
      </main>

      <Footer />
    </>
  );
}
