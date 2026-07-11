// Renders a JSON-LD <script> for structured data. Server-safe, no client JS.
// Using a component keeps the (safe, self-generated) JSON serialization in one
// place rather than scattering dangerouslySetInnerHTML across pages.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Data is constructed by us from our own values, not user free-text HTML;
      // JSON.stringify escapes it. We additionally escape "<" to prevent any
      // stored string from breaking out of the script tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
