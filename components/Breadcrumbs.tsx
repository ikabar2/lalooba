"use client";

import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string; // omitted on the current (last) crumb — it isn't a link
};

// Semantic breadcrumb trail: <nav aria-label="Breadcrumb"><ol>...</ol></nav>
// is the standard accessible pattern (matches what screen readers and the
// WAI-ARIA breadcrumb pattern expect) — an <ol> because a breadcrumb trail
// genuinely is an ordered sequence (Home before Marketplace before the
// category), not just a visually-similar list of links.
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-navy-600">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden="true" className="text-navy-300">
                  /
                </span>
              )}
              {isLast || !item.href ? (
                // The current page is announced as such (aria-current),
                // not rendered as a dead/no-op link — a breadcrumb's last
                // item pointing at itself is a common but pointless pattern.
                <span aria-current="page" className="font-semibold text-navy-900">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="transition hover:text-gold-400 hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
