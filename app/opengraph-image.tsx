import { ImageResponse } from "next/og";

// Dynamically generated Open Graph image (1200×630). Using Next's ImageResponse
// means we ship a real, branded social-share image without committing a binary
// PNG — it's rendered on demand and cached. This is the file-based metadata
// convention: Next automatically wires this as the site's opengraph-image.
export const runtime = "edge";
export const alt = "Lalooba — Community Marketplace & Delivery Service";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B1220",
          color: "#FFFFFF",
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 700, color: "#E9B949" }}>Lalooba</div>
        <div style={{ fontSize: 40, marginTop: 24, color: "#E5E7EB" }}>
          Community Marketplace &amp; Delivery Service
        </div>
        <div style={{ fontSize: 28, marginTop: 16, color: "#9CA3AF" }}>
          Canada &amp; United States · English &amp; العربية
        </div>
      </div>
    ),
    { ...size }
  );
}
