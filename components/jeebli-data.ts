export type JeebLiOffer = {
  id: string;
  traveler: {
    id: string;
    name: string;
    avatarInitials: string;
    verified: boolean;
  };
  originCity: { en: string; ar: string };
  originCountry: { en: string; ar: string };
  destinationCity: { en: string; ar: string };
  destinationCountry: { en: string; ar: string };
  departureDate: string; // ISO date
  availableWeightKg: number;
  pricePerKg: number;
  allowedItems: { en: string; ar: string };
};

// Sample data shaped exactly like a future Supabase query result.
// Bilingual city/country/allowedItems fields, same pattern as listings-data.ts —
// switching to Arabic translates the actual trip content, not just UI chrome.
// Replace with:
// const { data } = await supabase.from("jeeb_li_offers")
//   .select("*, traveler:profiles(id, full_name, phone_verified)")
//   .eq("status", "open")
export const sampleOffers: JeebLiOffer[] = [
  {
    id: "jl-1",
    traveler: { id: "00000000-0000-0000-0000-000000000101", name: "Karim M.", avatarInitials: "KM", verified: true },
    originCity: { en: "Casablanca", ar: "الدار البيضاء" },
    originCountry: { en: "Morocco", ar: "المغرب" },
    destinationCity: { en: "Montreal", ar: "مونتريال" },
    destinationCountry: { en: "Canada", ar: "كندا" },
    departureDate: "2026-07-14",
    availableWeightKg: 12,
    pricePerKg: 6,
    allowedItems: {
      en: "Clothing, dry food, documents — no liquids or electronics",
      ar: "ملابس، أغذية جافة، وثائق — لا سوائل ولا أجهزة إلكترونية",
    },
  },
  {
    id: "jl-2",
    traveler: { id: "00000000-0000-0000-0000-000000000102", name: "Nadia B.", avatarInitials: "NB", verified: true },
    originCity: { en: "Algiers", ar: "الجزائر العاصمة" },
    originCountry: { en: "Algeria", ar: "الجزائر" },
    destinationCity: { en: "New York", ar: "نيويورك" },
    destinationCountry: { en: "United States", ar: "الولايات المتحدة" },
    departureDate: "2026-07-22",
    availableWeightKg: 8,
    pricePerKg: 5,
    allowedItems: { en: "Clothing and gifts only", ar: "ملابس وهدايا فقط" },
  },
  {
    id: "jl-3",
    traveler: { id: "00000000-0000-0000-0000-000000000103", name: "Ahmed S.", avatarInitials: "AS", verified: true },
    originCity: { en: "Cairo", ar: "القاهرة" },
    originCountry: { en: "Egypt", ar: "مصر" },
    destinationCity: { en: "Toronto", ar: "تورونتو" },
    destinationCountry: { en: "Canada", ar: "كندا" },
    departureDate: "2026-08-03",
    availableWeightKg: 15,
    pricePerKg: 7,
    allowedItems: {
      en: "Anything except restricted items — ask before booking",
      ar: "أي شيء باستثناء الأصناف المحظورة — اسأل قبل الحجز",
    },
  },
  {
    id: "jl-4",
    traveler: { id: "00000000-0000-0000-0000-000000000104", name: "Mariam K.", avatarInitials: "MK", verified: false },
    originCity: { en: "Khartoum", ar: "الخرطوم" },
    originCountry: { en: "Sudan", ar: "السودان" },
    destinationCity: { en: "Seattle", ar: "سياتل" },
    destinationCountry: { en: "United States", ar: "الولايات المتحدة" },
    departureDate: "2026-08-09",
    availableWeightKg: 10,
    pricePerKg: 8,
    allowedItems: { en: "Small parcels and documents", ar: "طرود صغيرة ووثائق" },
  },
];
