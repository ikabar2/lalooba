// Shared domain types for the marketplace. These used to live alongside the
// sample-data arrays in *-data.ts; they were extracted here when the sample
// data was removed for production so the types survive independently of any
// demo content. The canonical `Listing` type stays in ListingCard.tsx.

export type Seller = {
  id: string;
  name: string;
  avatarInitials: string;
  verified: boolean;
  city: { en: string; ar: string };
  country: "CA" | "US";
  activeSince: string; // "Month YYYY"
  rating: number; // 0–5, one decimal
  reviewCount: number;
  bio: { en: string; ar: string };
};

export type Review = {
  id: string;
  sellerId: string;
  reviewerName: string;
  rating: number; // 1–5
  comment: { en: string; ar: string };
  date: string; // "Month YYYY"
};

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
