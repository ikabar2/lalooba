import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default async function AboutPage() {
  const detectedCity = (await cookies()).get("lalooba-city")?.value ?? null;

  return (
    <>
      <Header detectedCity={detectedCity} />

      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="mb-3 font-display text-2xl font-medium text-navy-900">
          About Lalooba
        </h1>

        <p className="mb-5 text-sm leading-relaxed text-navy-600">
          Lalooba is a free, bilingual community platform built for diaspora
          communities across Canada and the United States. We bring together
          a marketplace and travel logistics into one place — designed for
          people who want to buy, sell, and stay connected with their
          community in both English and Arabic.
        </p>

        <h2 className="mb-2 mt-7 text-base font-bold text-navy-900">Why we built this</h2>
        <p className="mb-5 text-sm leading-relaxed text-navy-600">
          Settling somewhere new often means rebuilding everything from
          scratch — finding trustworthy sellers, someone who speaks your
          language, or a safe way to send something home. Lalooba exists to
          make those things easier, in one trusted place, free to use.
        </p>

        <h2 className="mb-2 mt-7 text-base font-bold text-navy-900">What&apos;s on Lalooba</h2>
        <ul className="mb-5 flex flex-col gap-2 text-sm leading-relaxed text-navy-600">
          <li>
            <strong className="text-navy-900">Marketplace</strong> — buy and
            sell items locally, from clothing and food to jewelry and books.
          </li>
          <li>
            <strong className="text-navy-900">Delivery Service</strong> — travelers
            share unused baggage space with people sending items home.
          </li>
        </ul>

        <h2 className="mb-2 mt-7 text-base font-bold text-navy-900">Where we operate</h2>
        <p className="text-sm leading-relaxed text-navy-600">
          Lalooba is currently available to members in the United States and
          Canada. We hope to expand to more regions over time.
        </p>
      </main>

      <Footer />
    </>
  );
}
