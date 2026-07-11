import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Seller, Review } from "@/components/types";
import type { Listing } from "@/components/ListingCard";
import { createClient } from "@/lib/supabase/server";
import { fetchListingsBySeller } from "@/lib/listings-query";
import SellerProfileBody from "@/components/SellerProfileBody";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<import("next").Metadata> {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("display_name, full_name, city_en, country")
      .eq("id", id)
      .maybeSingle();
    if (!data) return { title: "Seller not found" };
    const name = data.display_name || data.full_name || "Member";
    const loc = data.city_en ? `${data.city_en}, ${data.country ?? ""}`.trim() : "";
    return {
      title: `${name} — Seller Profile`,
      description: `Listings from ${name}${loc ? ` in ${loc}` : ""} on Lalooba.`,
      alternates: { canonical: `/seller/${id}` },
    };
  } catch {
    return { title: "Seller Profile" };
  }
}

// Adapts a real `profiles` row into the Seller shape SellerProfileBody
// renders. Bilingual fields get the same value in both languages (a profile
// stores one city string, not a translated pair); reviews come back empty
// until the reviews feature has real rows.
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

  let seller: Seller | null = null;
  const reviews: Review[] = [];
  let otherListings: Listing[] = [];

  // Real profiles only. A profile that doesn't exist is a genuine 404.
  try {
    const supabase = await createClient();
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("id, display_name, full_name, city_en, country, bio_en, id_verified, created_at")
      .eq("id", id)
      .maybeSingle();
    if (profileRow) {
      seller = realProfileToSeller(profileRow);
      otherListings = await fetchListingsBySeller(id);
    }
  } catch {
    // Supabase not configured — fall through to 404.
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
