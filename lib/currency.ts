// Currency display helpers for the marketplace.
//
// IMPORTANT: this is NOT an auto-converter. For bank-transfer / remittance
// listings, the SELLER enters the SDG amount they give for their posted
// local price — that's their own rate, which they set and control. The app
// only formats and displays the seller-provided numbers; it never computes
// an exchange rate itself (remittance rates are operator-set, not market
// mid-rates, and must reflect exactly what the seller is offering).

export type Currency = "CAD" | "USD";

// Country → local currency, used across the app.
export const currencyForCountry: Record<"CA" | "US", Currency> = {
  CA: "CAD",
  US: "USD",
};

// Format a whole SDG amount with thousands separators (SDG values are large,
// so no decimals). e.g. 155000 -> "155,000".
export function formatSDG(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "";
  return Math.round(amount).toLocaleString("en-US");
}
