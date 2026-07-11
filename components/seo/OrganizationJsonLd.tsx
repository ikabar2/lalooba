import JsonLd from "./JsonLd";
import { getSiteUrl } from "@/lib/site-url";

// Organization + WebSite structured data, rendered once site-wide (in the root
// layout). Organization powers the knowledge-panel/brand entity; WebSite
// enables the sitelinks search box in Google results.
export default function OrganizationJsonLd() {
  const siteUrl = getSiteUrl();

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Lalooba",
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    description:
      "A free bilingual community marketplace for the Sudanese diaspora in Canada and the US.",
    areaServed: ["CA", "US"],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Lalooba",
    url: siteUrl,
    inLanguage: ["en", "ar"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/marketplace?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <JsonLd data={organization} />
      <JsonLd data={website} />
    </>
  );
}
