import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

// Category keys that map to crawlable /marketplace?category= pages.
const CATEGORY_KEYS = [
  "cat_clothing",
  "cat_food",
  "cat_homemade",
  "cat_crafts",
  "cat_electronics",
  "cat_perfumes",
  "cat_cars",
  "cat_barbershop",
  "cat_tax",
  "cat_other",
];

export const revalidate = 3600; // regenerate hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/marketplace`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/jeebli`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/prohibited-items`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Category landing pages (marketplace filtered by category) — indexable
  // hubs that link out to the listings within them.
  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_KEYS.map((c) => ({
    url: `${base}/marketplace?category=${c}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  // All active listings — the bulk of crawlable content. Degrades gracefully
  // to just the static routes if the DB isn't reachable at build/request time.
  let listingRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("listings")
      .select("id, created_at")
      .eq("status", "active")
      .neq("availability", "inactive")
      .order("created_at", { ascending: false })
      .limit(5000); // sitemap cap; a sitemap index would be the next step beyond this

    listingRoutes = (data ?? []).map((row: { id: string; created_at: string }) => ({
      url: `${base}/listing/${row.id}`,
      lastModified: row.created_at ? new Date(row.created_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // Supabase unavailable — ship the static + category routes only.
  }

  return [...staticRoutes, ...categoryRoutes, ...listingRoutes];
}
