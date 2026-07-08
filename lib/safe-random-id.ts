// crypto.randomUUID() is not available everywhere — it requires a secure
// context (HTTPS) and is missing entirely in some older/embedded mobile
// WebViews (in-app browsers, older Android System WebView versions). When
// it's missing, calling it throws a TypeError. That was happening directly
// inside the photo-upload submit handler (app/post/page.tsx) with nothing
// to catch it — exactly the kind of uncaught error that, with no error
// boundary in place, can take the whole page down. This never throws:
// falls back to crypto.getRandomValues (broader support) and finally to
// Math.random if even that's missing.
export function safeRandomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Last-resort fallback — not cryptographically strong, but this is only
  // ever used to make a storage file path unique, not for anything
  // security-sensitive (auth tokens, password reset codes, etc.).
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}
