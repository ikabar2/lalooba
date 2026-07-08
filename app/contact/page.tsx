import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CONTACT_EMAIL } from "@/lib/footer-content";

export default async function ContactPage() {
  const detectedCity = (await cookies()).get("lalooba-city")?.value ?? null;

  return (
    <>
      <Header detectedCity={detectedCity} />

      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="mb-3 font-display text-2xl font-medium text-navy-900">Contact us</h1>
        <p className="mb-6 text-sm leading-relaxed text-navy-600">
          Questions, feedback, or need help with your account? Reach out and
          we&apos;ll get back to you.
        </p>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center gap-2 rounded-lg border border-navy-100 bg-white px-5 py-3 text-sm font-bold text-navy-900 transition hover:bg-navy-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16v16H4z" />
            <path d="M22 6l-10 7L2 6" />
          </svg>
          {CONTACT_EMAIL}
        </a>
      </main>

      <Footer />
    </>
  );
}
