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
};

module.exports = nextConfig;
