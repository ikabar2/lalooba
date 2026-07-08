// Single source of truth for CA/US display names in both languages.
// Before this, the same { CA: "Canada"/"كندا", US: ... } mapping was
// independently re-typed in components/listings-data.ts,
// components/ListingCard.tsx (as a local duplicate of the same constant),
// and inline as a nested ternary in components/SellerProfileBody.tsx —
// three places that all had to agree by coincidence rather than by
// construction. One typo in any of them would silently show the wrong
// country name in just that one spot.
export const countryNames: Record<"CA" | "US", { en: string; ar: string }> = {
  CA: { en: "Canada", ar: "كندا" },
  US: { en: "United States", ar: "الولايات المتحدة" },
};
