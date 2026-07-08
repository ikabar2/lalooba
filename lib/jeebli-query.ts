import { createClient } from "@/lib/supabase/server";
import type { JeebLiOffer } from "@/components/types";

// Read path for Jeeb Li traveler offers. Offers are inserted by the
// post-trip form; this queries them back for the browse page. Adapts the DB
// row (single-language text columns) to the UI's bilingual shape by using the
// same value for en/ar (offers store one free-text city/country string, not
// a translated pair).

type OfferRow = {
  id: string;
  traveler_id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  available_weight_kg: number;
  price_per_kg: number;
  allowed_items: string | null;
  traveler: {
    display_name: string | null;
    full_name: string | null;
    id_verified: boolean | null;
  } | null;
};

function rowToOffer(row: OfferRow): JeebLiOffer {
  // Normalize the embedded to-one relation (PostgREST may return a 1-element
  // array) to a single record before reading its fields.
  const travelerRaw = row.traveler as unknown;
  const traveler = (Array.isArray(travelerRaw) ? travelerRaw[0] : travelerRaw) as OfferRow["traveler"];
  const name = traveler?.display_name || traveler?.full_name || "Traveler";
  const both = (s: string) => ({ en: s, ar: s });
  return {
    id: row.id,
    traveler: {
      id: row.traveler_id,
      name,
      avatarInitials: name.slice(0, 2).toUpperCase(),
      verified: !!traveler?.id_verified,
    },
    originCity: both(row.origin_city),
    originCountry: both(row.origin_country),
    destinationCity: both(row.destination_city),
    destinationCountry: both(row.destination_country),
    departureDate: row.departure_date,
    availableWeightKg: row.available_weight_kg,
    pricePerKg: row.price_per_kg,
    allowedItems: both(row.allowed_items ?? ""),
  };
}

// All open, upcoming offers, soonest departure first. Degrades to [] on any
// error / missing config so the browse page renders an empty state rather
// than crashing.
export async function fetchJeebLiOffers(): Promise<JeebLiOffer[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jeeb_li_offers")
      .select(
        `id, traveler_id, origin_city, origin_country, destination_city,
         destination_country, departure_date, available_weight_kg,
         price_per_kg, allowed_items,
         traveler:profiles ( display_name, full_name, id_verified )`
      )
      .eq("status", "open")
      .gte("departure_date", new Date().toISOString().slice(0, 10))
      .order("departure_date", { ascending: true });

    if (error) {
      console.error("[fetchJeebLiOffers] query failed:", error.message);
      return [];
    }
    return (data as unknown as OfferRow[]).map(rowToOffer);
  } catch (err) {
    console.error("[fetchJeebLiOffers] threw:", err instanceof Error ? err.message : err);
    return [];
  }
}

// One offer by id — for the "request space" page.
export async function fetchJeebLiOfferById(id: string): Promise<JeebLiOffer | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jeeb_li_offers")
      .select(
        `id, traveler_id, origin_city, origin_country, destination_city,
         destination_country, departure_date, available_weight_kg,
         price_per_kg, allowed_items,
         traveler:profiles ( display_name, full_name, id_verified )`
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[fetchJeebLiOfferById] query failed:", error.message);
      return null;
    }
    if (!data) return null;
    return rowToOffer(data as unknown as OfferRow);
  } catch (err) {
    console.error("[fetchJeebLiOfferById] threw:", err instanceof Error ? err.message : err);
    return null;
  }
}
