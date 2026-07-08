"use client";

import { useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

// Next.js App Router error boundary. Before this file existed, there was
// NO error boundary anywhere in the app — any uncaught error in any page
// or component (a failed fetch, a bad prop, a browser API missing on some
// mobile device) unmounted the entire React tree with nothing to catch it,
// which is exactly what "the app briefly loads then turns into a white
// screen" looks like from the outside. This won't stop something from
// throwing, but it stops a throw from meaning a blank page — the person
// sees a real screen with a way to recover instead.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-navy-50 px-5 text-center">
      <Logo size="md" />
      <div className="max-w-sm">
        <p className="mb-2 font-display text-xl text-navy-900">Something went wrong</p>
        <p className="mb-6 text-sm text-navy-600">
          This page hit an unexpected error. Try again, or head back home.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-navy-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-navy-200 px-5 py-2.5 text-sm font-bold text-navy-900 transition hover:bg-white"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
