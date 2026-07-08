"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

export default function ImageGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  // Guard once, here, rather than at every images[i] access below. An
  // empty array isn't just a missing-photo display issue — `(i + 1) %
  // images.length` in goNext/goPrev below would be `% 0` (NaN) with a
  // truly empty array, and `images[NaN]` is undefined, which throws inside
  // next/image the same way an undefined src does anywhere else in the app
  // (see components/ListingCard.tsx for the matching fix).
  const safeImages = images.length > 0 ? images : ["/images/placeholder.jpg"];

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const goNext = useCallback(
    () => setActiveIndex((i) => (i + 1) % safeImages.length),
    [safeImages.length]
  );
  const goPrev = useCallback(
    () => setActiveIndex((i) => (i - 1 + safeImages.length) % safeImages.length),
    [safeImages.length]
  );

  // Swipe support — the arrows are the discoverable affordance, but on
  // mobile a swipe is what people actually try first, arrows or not.
  // 40px threshold avoids treating an accidental small drag as a swipe.
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  // Keyboard nav while the lightbox is open — arrow keys + escape
  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, goNext, goPrev]);

  // Lock background scroll while the lightbox is open — matters most on
  // mobile, where a full-screen overlay with a scrollable page behind it
  // feels broken if the page keeps scrolling underneath your thumb.
  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  return (
    <div>
      {/* Main display image. Previously this whole area was a single
          <button> that only opened the lightbox — browsing the other
          photos required either the small thumbnail strip below or
          discovering the lightbox first. Prev/next arrows now live right
          here, since that's where people actually look first. */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-xl bg-navy-50"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="View all photos"
          className="absolute inset-0"
        >
          <Image
            src={safeImages[activeIndex]}
            alt={`${alt} — photo ${activeIndex + 1} of ${safeImages.length}`}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
          />
        </button>

        {safeImages.length > 1 && (
          <>
            <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="14" height="14" rx="2" />
                <path d="M7 21h14v-14" />
              </svg>
              {activeIndex + 1} / {safeImages.length}
            </span>

            {/* Siblings of the lightbox-open button, not nested inside it —
                a click lands on whichever element is actually under the
                cursor, so these just work without needing stopPropagation. */}
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/65"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/65"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip — horizontally scrollable, designed for a thumb swipe
          on mobile rather than assuming mouse hover/click only */}
      {safeImages.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {safeImages.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`View photo ${i + 1}`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === activeIndex ? "border-navy-900" : "border-transparent"
              }`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Full-screen lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-medium">
              {activeIndex + 1} / {safeImages.length}
            </span>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close gallery"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="relative flex-1">
            <Image
              src={safeImages[activeIndex]}
              alt={`${alt} — photo ${activeIndex + 1} of ${safeImages.length}`}
              fill
              sizes="100vw"
              className="object-contain"
            />

            {safeImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip inside the lightbox too, for quick jumping on
              larger screens — harmless on mobile since it's just a scroll row */}
          {safeImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto px-4 py-3">
              {safeImages.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-label={`View photo ${i + 1}`}
                  className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 transition ${
                    i === activeIndex ? "border-white" : "border-transparent opacity-60"
                  }`}
                >
                  <Image src={src} alt="" fill sizes="48px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
