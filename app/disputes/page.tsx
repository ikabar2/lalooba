import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CONTACT_EMAIL } from "@/lib/footer-content";

export default async function DisputesPage() {
  const detectedCity = (await cookies()).get("lalooba-city")?.value ?? null;

  return (
    <>
      <Header detectedCity={detectedCity} />

      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="mb-3 font-display text-2xl font-medium text-navy-900">
          Dispute resolution
        </h1>

        <p className="mb-5 text-sm leading-relaxed text-navy-600">
          Most transactions on Lalooba go smoothly, but if something goes
          wrong — an item not as described, a payment issue, or a Delivery Service
          delivery that didn&apos;t go as agreed — here&apos;s how to get help.
        </p>

        <h2 className="mb-2 mt-7 text-base font-bold text-navy-900">How to report an issue</h2>
        <p className="mb-5 text-sm leading-relaxed text-navy-600">
          Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-navy-900 underline">
            {CONTACT_EMAIL}
          </a>{" "}
          with your account email, the listing or conversation involved, and
          a description of what happened. Include screenshots if you have
          them — they help us resolve things faster.
        </p>

        <h2 className="mb-2 mt-7 text-base font-bold text-navy-900">What happens next</h2>
        <ul className="mb-5 flex flex-col gap-2 text-sm leading-relaxed text-navy-600">
          <li>We review the conversation and listing history connected to your report.</li>
          <li>Both sides may be contacted for more information.</li>
          <li>
            Accounts with repeated or serious violations may be suspended —
            this is also how automatically flagged listings are reviewed by
            our team before being approved or removed.
          </li>
        </ul>

        <h2 className="mb-2 mt-7 text-base font-bold text-navy-900">Before it gets to a dispute</h2>
        <p className="text-sm leading-relaxed text-navy-600">
          Keep conversations on Lalooba&apos;s messaging system rather than
          moving to another app — it gives us the full context if you ever
          need help, and protects you if a disagreement comes up later.
        </p>
      </main>

      <Footer />
    </>
  );
}
