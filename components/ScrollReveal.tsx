"use client";

import { useEffect, useRef, useState } from "react";

export default function ScrollReveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // IntersectionObserver is supported in effectively all current mobile
    // browsers, but "effectively all" isn't "all" — some embedded/in-app
    // WebViews lag behind. This component renders on nearly every page
    // (homepage grids, category bar, featured section), so an unguarded
    // `new IntersectionObserver(...)` throwing here — with no fallback —
    // would take down the whole page for exactly the audience most likely
    // to be on an older or embedded mobile browser. Missing support just
    // means content shows immediately instead of animating in; that's a
    // fine trade for "the page actually renders."
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);

    // Failsafe timer (issue #3): if the observer never reports an
    // intersection — which can happen in some Android WebViews, and is more
    // likely under dir="rtl" — reveal anyway after 1s so content is never
    // permanently stuck invisible (the white-screen symptom). Pairs with
    // the CSS reveal-failsafe animation; either one alone is sufficient,
    // both is deliberate belt-and-suspenders for the exact reported bug.
    const failsafe = window.setTimeout(() => {
      setVisible(true);
      observer.disconnect();
    }, 1000);

    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
