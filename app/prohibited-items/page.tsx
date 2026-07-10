import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProhibitedItemsList from "@/components/ProhibitedItemsList";

export default async function ProhibitedItemsPage() {
  const detectedCity = (await cookies()).get("lalooba-city")?.value ?? null;

  return (
    <>
      <Header detectedCity={detectedCity} />

      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="mb-3 font-display text-2xl font-medium text-navy-900">
          Prohibited items
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-navy-600">
          The following items cannot be listed, sold, or sent through the Delivery Service
          on Lalooba. This list reflects common restrictions across Canada
          and the United States and is provided for guidance — it is not
          legal advice, and additional restrictions may apply depending on
          your specific item, province, or state.
        </p>

        <ProhibitedItemsList />

        <p className="mt-6 text-xs text-navy-400">
          Listings or Delivery Service requests involving prohibited items will be
          removed and may result in account suspension.
        </p>
      </main>

      <Footer />
    </>
  );
}
