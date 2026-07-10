import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CONTACT_EMAIL } from "@/lib/footer-content";

export default async function PrivacyPage() {
  const detectedCity = (await cookies()).get("lalooba-city")?.value ?? null;

  return (
    <>
      <Header detectedCity={detectedCity} />

      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="mb-1 font-display text-2xl font-medium text-navy-900">
          Privacy policy
        </h1>
        <p className="mb-7 text-xs text-navy-400">Last updated: placeholder — set this when finalized.</p>

        <h2 className="mb-2 text-base font-bold text-navy-900">What we collect</h2>
        <ul className="mb-5 flex flex-col gap-2 text-sm leading-relaxed text-navy-600">
          <li>
            <strong className="text-navy-900">Account info</strong> — your
            name, email, phone number, and password (stored securely, never
            in plain text) when you sign up.
          </li>
          <li>
            <strong className="text-navy-900">Listings &amp; photos</strong>{" "}
            — anything you post to the marketplace or Delivery Service, including
            uploaded photos.
          </li>
          <li>
            <strong className="text-navy-900">Messages</strong> — content
            you send through Lalooba&apos;s messaging system, visible only
            to you and the person you&apos;re messaging.
          </li>
          <li>
            <strong className="text-navy-900">Approximate location</strong>{" "}
            — your country and city are detected automatically from your
            connection to show you relevant local listings. We do not
            collect precise GPS location.
          </li>
        </ul>

        <h2 className="mb-2 mt-7 text-base font-bold text-navy-900">How we use it</h2>
        <p className="mb-5 text-sm leading-relaxed text-navy-600">
          To operate the platform — showing you relevant listings, enabling
          messaging, verifying accounts, and keeping the community safe
          through automated and manual review of new listings.
        </p>

        <h2 className="mb-2 mt-7 text-base font-bold text-navy-900">Who can see your information</h2>
        <p className="mb-5 text-sm leading-relaxed text-navy-600">
          Your name and listings are visible to other members. Your email
          and phone number are never shown publicly — they&apos;re used for
          account security and verification only. Messages are private
          between you and the other person in the conversation.
        </p>

        <h2 className="mb-2 mt-7 text-base font-bold text-navy-900">Your choices</h2>
        <p className="mb-5 text-sm leading-relaxed text-navy-600">
          You can browse Lalooba without an account. You can request account
          deletion or a copy of your data at any time by emailing{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-navy-900 underline">
            {CONTACT_EMAIL}
          </a>.
        </p>

        <p className="mt-9 text-xs leading-relaxed text-navy-400">
          This page is a starting template, not a finished legal document —
          have it reviewed by a lawyer before launch to make sure it meets
          PIPEDA (Canada) and applicable US state privacy law requirements
          for your specific data practices.
        </p>
      </main>

      <Footer />
    </>
  );
}
