import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / auth / transactional routes shouldn't be indexed — they're
      // per-user, gated, or have no standalone search value.
      disallow: [
        "/account",
        "/messages",
        "/messages/",
        "/post",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/verification",
        "/jeebli/post-trip",
        "/jeebli/request/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
