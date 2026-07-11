/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Next.js serves whichever format the browser supports best, in this
    // order of preference — AVIF first (smallest), falling back to WebP,
    // then the original format for very old browsers. No manual conversion
    // needed; this happens automatically on every <Image> request.
    formats: ["image/avif", "image/webp"],

    // Responsive breakpoints Next.js generates on demand. Combined with the
    // `sizes` prop on each <Image>, the browser downloads only the size it
    // actually needs — a phone never downloads the same file a desktop does.
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536],
    imageSizes: [80, 120, 160, 200, 280, 400],

    // Allow optimizing images served from Supabase Storage's CDN once real
    // listing photos exist there. Update the hostname after you create your
    // Supabase project — it's always <project-ref>.supabase.co.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Production security headers, applied to every route. These defend against
  // clickjacking, MIME-sniffing, referrer leakage, and force HTTPS. A strict
  // Content-Security-Policy isn't set here because Next's inline runtime +
  // Supabase + the geocoder need careful allow-listing; add a CSP via a nonce
  // once those origins are finalized. The headers below are the high-value,
  // low-risk set that won't break functionality.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking: disallow embedding the site in frames.
          { key: "X-Frame-Options", value: "DENY" },
          // Stop browsers from MIME-sniffing responses into a different type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak full URLs to third parties in the Referer header.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Lock down powerful features by default; geolocation is requested
          // explicitly from our own origin only.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(), geolocation=(self)",
          },
          // Force HTTPS for two years including subdomains (safe once the
          // site is served over HTTPS, which Vercel does by default).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
