"use client";

import { useEffect } from "react";

// app/error.tsx catches errors inside pages, but NOT errors thrown by the
// root layout itself (the <html>/<body> wrapper, providers, etc.) — Next.js
// requires a separate global-error.tsx for that, and it has to render its
// own <html>/<body> since it fully replaces the root layout when it fires.
//
// Deliberately dependency-free: no imported components, no Tailwind
// classes, just inline styles. If the root layout is broken badly enough
// to reach this file, importing more app code here would risk failing for
// the same reason and leaving genuinely nothing on screen — the one
// scenario this file exists specifically to prevent.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          background: "#F5F6FA",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.25rem",
        }}
      >
        <div>
          <p style={{ marginBottom: "0.5rem", fontSize: "1.25rem", fontWeight: 600, color: "#0B1220" }}>
            Something went wrong
          </p>
          <p style={{ marginBottom: "1.5rem", fontSize: "0.875rem", color: "#475569" }}>
            The app hit an unexpected error loading this page.
          </p>
          <button
            onClick={reset}
            style={{
              borderRadius: "0.375rem",
              background: "#0B1220",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.875rem",
              padding: "0.625rem 1.25rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
