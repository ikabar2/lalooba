import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/language-context";
import DisableInspect from "@/components/DisableInspect";
import MobileBottomNav from "@/components/MobileBottomNav";
import RouteAnnouncer from "@/components/RouteAnnouncer";
import GeolocationDetector from "@/components/GeolocationDetector";
import OrganizationJsonLd from "@/components/seo/OrganizationJsonLd";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

// Guard: new URL() throws on a malformed value. A bad NEXT_PUBLIC_SITE_URL
// shouldn't take down every page, so fall back to the production domain.
function safeUrl(u: string): URL {
  try {
    return new URL(u);
  } catch {
    return new URL("https://lalooba.com");
  }
}

export const metadata: Metadata = {
  // metadataBase lets Next resolve all relative OG/canonical URLs to absolute
  // ones (required for valid Open Graph and canonical tags).
  metadataBase: safeUrl(siteUrl),
  title: {
    default: "Lalooba — Community Marketplace & Delivery Service",
    // Child pages set just their own title; this appends the brand.
    template: "%s | Lalooba",
  },
  description:
    "Lalooba is a free bilingual (English & Arabic) community marketplace for the Sudanese diaspora in Canada and the US. Buy and sell locally, and send items home with trusted travelers.",
  applicationName: "Lalooba",
  keywords: [
    "Sudanese marketplace",
    "diaspora marketplace",
    "buy and sell Canada",
    "buy and sell US",
    "Arabic marketplace",
    "send items to Sudan",
    "community marketplace",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Lalooba",
    title: "Lalooba — Community Marketplace & Delivery Service",
    description:
      "A free bilingual community marketplace for the Sudanese diaspora in Canada and the US. Buy, sell, and send items home with trusted travelers.",
    url: siteUrl,
    locale: "en_US",
    alternateLocale: ["ar_AR"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lalooba — Community Marketplace & Delivery Service",
    description:
      "A free bilingual community marketplace for the Sudanese diaspora in Canada and the US.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/manifest.webmanifest",
};

// Explicit mobile-first viewport — most of this audience is on a phone
// first, not a desktop, so this isn't a formality. maximumScale is left at
// the default (no restriction) so people can still pinch-zoom, which
// matters for accessibility and for reading Arabic script comfortably.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=Tajawal:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <OrganizationJsonLd />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <DisableInspect />
        <LanguageProvider>
          <RouteAnnouncer />
          <GeolocationDetector />
          {/* pb-16 on mobile only reserves space for the fixed bottom nav so
              it never covers the footer or last row of content; removed at
              lg where the bottom nav is hidden. */}
          <div className="pb-16 lg:pb-0">{children}</div>
          <MobileBottomNav />
        </LanguageProvider>
      </body>
    </html>
  );
}
