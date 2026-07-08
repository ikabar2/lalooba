import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default async function VerificationPage() {
  const detectedCity = (await cookies()).get("lalooba-city")?.value ?? null;

  return (
    <>
      <Header detectedCity={detectedCity} />

      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="mb-3 font-display text-2xl font-medium text-navy-900">
          Verification &amp; trust
        </h1>
        <p className="mb-7 text-sm leading-relaxed text-navy-600">
          Lalooba uses a layered trust system designed to make buying,
          selling, and messaging on the platform safer for everyone.
        </p>

        <div className="mb-4 flex items-start gap-3 rounded-xl border border-navy-100 bg-white p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.5v1a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 0H5.5a2 2 0 012 1.72c.13.81.34 1.6.63 2.36a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006 6l1.72-1.27a2 2 0 012.11-.45c.76.29 1.55.5 2.36.63A2 2 0 0122 16.5z" />
            </svg>
          </span>
          <div>
            <p className="mb-1 text-sm font-bold text-navy-900">Phone verification</p>
            <p className="text-sm leading-relaxed text-navy-600">
              Every account requires a real North American (US/Canada)
              phone number at signup, restricted at the database level —
              not just a form check.
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-start gap-3 rounded-xl border border-navy-100 bg-white p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <div>
            <p className="mb-1 text-sm font-bold text-navy-900">ID verification</p>
            <p className="text-sm leading-relaxed text-navy-600">
              Optional government ID verification unlocks a verified badge,
              shown next to your name across the platform. ID upload is
              rolling out — check back soon if you don&apos;t see this
              option in your account yet.
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-start gap-3 rounded-xl border border-navy-100 bg-white p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
            </svg>
          </span>
          <div>
            <p className="mb-1 text-sm font-bold text-navy-900">Trust score</p>
            <p className="text-sm leading-relaxed text-navy-600">
              Built from verification status, completed transactions, and
              community feedback. A higher trust score signals a more
              established, reliable member.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-navy-100 bg-white p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l8 4v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6z" />
            </svg>
          </span>
          <div>
            <p className="mb-1 text-sm font-bold text-navy-900">Automatic listing review</p>
            <p className="text-sm leading-relaxed text-navy-600">
              New or unverified accounts posting high-value or unusual
              listings may have them briefly held for review — this happens
              automatically and isn&apos;t a judgment on you personally.
            </p>
          </div>
        </div>

        <p className="mt-7 text-xs text-navy-400">
          Verification helps protect the community, but always use good
          judgment — meet in safe public places, and report anything that
          feels wrong.
        </p>
      </main>

      <Footer />
    </>
  );
}
