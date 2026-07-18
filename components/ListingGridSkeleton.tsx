// Loading placeholder for the listing feed. Server components fetch before
// they render, so without a Suspense fallback the grid simply pops in cold —
// this skeleton paints instantly in its place, matches the real card
// dimensions (so nothing shifts when data arrives / CLS stays clean), and
// uses Tailwind's built-in animate-pulse (which already respects
// prefers-reduced-motion via the motion-safe media query in modern Tailwind).
export default function ListingGridSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12" aria-hidden="true">
      <div className="mb-4 h-6 w-40 animate-pulse rounded bg-navy-100/60" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-navy-100 bg-white"
          >
            <div className="aspect-square animate-pulse bg-navy-100/60" />
            <div className="space-y-2 p-3">
              <div className="h-3.5 w-4/5 animate-pulse rounded bg-navy-100/60" />
              <div className="h-3.5 w-2/5 animate-pulse rounded bg-navy-100/60" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
