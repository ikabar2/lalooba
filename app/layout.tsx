import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/language-context";
import DisableInspect from "@/components/DisableInspect";
import MobileBottomNav from "@/components/MobileBottomNav";
import RouteAnnouncer from "@/components/RouteAnnouncer";

export const metadata: Metadata = {
  title: "Lalooba — Marketplace, Jobs, Interpreters & Jeeb Li",
  description:
    "Browse listings, jobs, and interpreters in your community. Sign up to message, post, and send items home.",
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
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {/* Temporarily disabled for debugging — re-enable once posting is
            fixed by removing the leading {false && } guard below. */}
        {false && <DisableInspect />}
        <LanguageProvider>
          <RouteAnnouncer />
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
