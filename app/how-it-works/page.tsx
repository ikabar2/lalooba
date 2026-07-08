import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const steps = [
  {
    title: "Browse for free",
    desc: "Search the marketplace, jobs, and interpreter directory without creating an account — no signup required to look around.",
  },
  {
    title: "Create a free account",
    desc: "When you're ready to message someone, post a listing, or apply for a job, sign up with your phone number, email, and a password. Takes under a minute.",
  },
  {
    title: "Message directly",
    desc: "Talk to sellers, interpreters, or travelers through Lalooba's built-in messaging — no need to share personal contact details until you're ready.",
  },
  {
    title: "Build trust over time",
    desc: "Verified phone numbers, IDs, and positive transaction history all contribute to your trust score, visible to others on the platform.",
  },
];

export default async function HowItWorksPage() {
  const detectedCity = (await cookies()).get("lalooba-city")?.value ?? null;

  return (
    <>
      <Header detectedCity={detectedCity} />

      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="mb-3 font-display text-2xl font-medium text-navy-900">
          How Lalooba works
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-navy-600">
          A quick overview of how to get the most out of the platform.
        </p>

        <div className="flex flex-col gap-5">
          {steps.map((step, i) => (
            <div key={step.title} className="flex gap-4 rounded-xl border border-navy-100 bg-white p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="mb-1 text-sm font-bold text-navy-900">{step.title}</p>
                <p className="text-sm leading-relaxed text-navy-600">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mb-2 mt-9 text-base font-bold text-navy-900">Using Jeeb Li</h2>
        <p className="mb-5 text-sm leading-relaxed text-navy-600">
          Travelers post a trip with their route, date, and available baggage
          weight. Senders browse trips and request space for an item they
          need delivered. Once a traveler accepts, you message directly to
          arrange the details.
        </p>

        <h2 className="mb-2 mt-7 text-base font-bold text-navy-900">Posting a listing</h2>
        <p className="text-sm leading-relaxed text-navy-600">
          Add photos, a title, price, and description. New or unverified
          accounts may have listings briefly held for automatic review — this
          is routine and not personal, and most listings go live quickly.
        </p>
      </main>

      <Footer />
    </>
  );
}
