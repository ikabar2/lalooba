// Renders a JSON-LD <script> for structured data. Server-safe, no client JS.
// Using a component keeps the (safe, self-generated) JSON serialization in one
// place rather than scattering dangerouslySetInnerHTML across pages.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JsonLd can embed user-controlled strings (listing titles, seller
      // names). JSON.stringify handles JSON escaping; we additionally escape
      // the characters that matter inside a <script> context so no stored
      // value can break out of the tag or start a comment/CDATA sequence.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data)
          .replace(/</g, "\\u003c")
          .replace(/>/g, "\\u003e")
          .replace(/&/g, "\\u0026")
          .replace(/\u2028/g, "\\u2028")
          .replace(/\u2029/g, "\\u2029"),
      }}
    />
  );
}
