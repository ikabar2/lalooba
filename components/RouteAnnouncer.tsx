"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Client-side navigation (next/link) swaps page content without a full
// document load, which is great for speed but silently breaks two things
// screen-reader and keyboard users rely on that a real page load gives for
// free:
//   1. Nothing announces that the page changed — a sighted user sees new
//      content, a screen-reader user hears nothing.
//   2. Keyboard focus stays wherever the clicked link was, instead of
//      moving to the new page — so the next Tab continues from the old
//      location, which is disorienting.
//
// This mounts once (in the root layout) and, on every pathname change:
//   - writes the new path into an aria-live region so assistive tech
//     announces the navigation
//   - moves focus to the #main-content jump target (the same one the
//     skip-link uses), so keyboard navigation restarts from the top of the
//     new page's content, past the header
//
// The very first render is skipped (isFirst ref) so it doesn't announce or
// steal focus on initial page load — only genuine route transitions.
export default function RouteAnnouncer() {
  const pathname = usePathname();
  const isFirst = useRef(true);
  const liveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    // Announce the new route. Using the pathname keeps this generic without
    // every page needing to wire up its own title — assistive tech reads
    // the updated live-region text on change.
    if (liveRef.current) {
      const readable = pathname === "/" ? "Home" : pathname.replace(/^\//, "").replace(/\//g, " ");
      liveRef.current.textContent = `Navigated to ${readable}`;
    }

    // Move focus to the top-of-content landmark. It's tabIndex={-1} (in
    // Header.tsx) so it's programmatically focusable without being a tab
    // stop itself. preventScroll avoids fighting the App Router's own
    // scroll-restoration on Back/Forward.
    const target = document.getElementById("main-content");
    target?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div
      ref={liveRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      // role=status is the conventional pairing with aria-live=polite for
      // non-urgent status updates like a route change.
      role="status"
    />
  );
}
