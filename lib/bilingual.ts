import type { Lang } from "./translations";

// Safe accessor for the { en, ar } bilingual objects used throughout the
// marketplace (listing.title, city, offer.originCountry, seller.bio, ...).
//
// Why this exists (issue #3 hardening): the app is full of `data[lang]`
// accesses. For sample data every object always has both `en` and `ar`, so
// this never mattered. But real Supabase rows can produce objects where the
// `ar` value is null/empty (title_ar not filled in), and a few adapters or
// future code paths could hand in a plain string instead of an {en,ar}
// object. In Arabic mode (`lang="ar"`):
//   • `obj[lang]` on an object with no `ar` key → undefined (renders blank)
//   • `str[lang]` on a plain string → undefined
//   • `obj[lang]` where `obj` itself is undefined → THROWS, white screens
// The last case is the dangerous one on the RTL render path. This helper
// collapses all of them to a safe string, preferring the requested
// language, falling back to the other language, then to empty — so a
// malformed bilingual value degrades to blank text instead of crashing the
// whole page (which, with no error boundary catching a render throw, is a
// white screen).
export function bi(
  value: { en?: string | null; ar?: string | null } | string | null | undefined,
  lang: Lang
): string {
  if (value == null) return "";
  if (typeof value === "string") return value; // plain string — same in both languages
  const primary = value[lang];
  if (primary && primary.trim() !== "") return primary;
  const other = lang === "ar" ? value.en : value.ar;
  if (other && other.trim() !== "") return other;
  return "";
}
