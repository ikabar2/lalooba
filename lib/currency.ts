// Currency display helpers for the marketplace.

export type Currency = "CAD" | "USD";

// Country → local currency, used across the app.
export const currencyForCountry: Record<"CA" | "US", Currency> = {
  CA: "CAD",
  US: "USD",
};
