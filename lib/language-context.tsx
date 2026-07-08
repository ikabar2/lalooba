"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { translations, Lang, TranslationKey } from "./translations";

type LanguageContextValue = {
  lang: Lang;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  // Restore saved preference on first load. localStorage access can throw
  // in some mobile contexts (Safari private browsing in older iOS
  // versions, sandboxed in-app WebViews with storage restrictions) — an
  // uncaught throw here, in an effect that runs on every single page,
  // would explain a broad "app loads then goes white" symptom across
  // exactly the mobile browsers most likely to restrict storage. Falling
  // back to English if this fails is a fine trade for "the page renders."
  //
  // CRASH SELF-HEAL (Samsung Arabic white-screen): the reported symptom is
  // that once switched to Arabic the app white-screens on EVERY load and
  // only recovers after clearing browsing data — the classic signature of
  // a persisted bad state that re-triggers on reload. To break that loop
  // without the user having to clear anything: we write a "pending render"
  // marker before applying a restored Arabic preference, and clear it once
  // render succeeds (in the effect below). If on load we find the marker
  // still set from last time, it means the previous Arabic render never
  // completed — so we DON'T restore Arabic again; we fall back to English,
  // which is known-good, letting the user back in. They can retry Arabic
  // deliberately; a silent reload loop can't trap them anymore.
  useEffect(() => {
    try {
      const crashedLastTime = window.sessionStorage.getItem("lalooba-lang-pending") === "ar";
      if (crashedLastTime) {
        window.sessionStorage.removeItem("lalooba-lang-pending");
        window.localStorage.setItem("lalooba-lang", "en");
        setLang("en");
        return;
      }
      const stored = window.localStorage.getItem("lalooba-lang") as Lang | null;
      if (stored === "en" || stored === "ar") setLang(stored);
    } catch (err) {
      console.warn("[language] Couldn't read saved language preference:", err);
    }
  }, []);

  // Flip <html dir="..."> and persist whenever language changes.
  useEffect(() => {
    // Mark an Arabic render as "in progress" BEFORE it paints. If the render
    // crashes, this marker survives to the next load and the effect above
    // uses it to fall back to English.
    try {
      if (lang === "ar") window.sessionStorage.setItem("lalooba-lang-pending", "ar");
    } catch {
      /* storage restricted — non-fatal */
    }

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

    try {
      window.localStorage.setItem("lalooba-lang", lang);
    } catch (err) {
      console.warn("[language] Couldn't save language preference:", err);
    }

    // Clear the crash marker only after a real paint frame has completed —
    // by then the Arabic UI has actually rendered without crashing. If a
    // render throw happens first, this callback never runs, the marker
    // persists, and the next load self-heals to English. Two rAFs ensures
    // we're past commit + paint, not just layout.
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        try {
          window.sessionStorage.removeItem("lalooba-lang-pending");
        } catch {
          /* non-fatal */
        }
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [lang]);

  const toggleLang = () => setLang((current) => (current === "en" ? "ar" : "en"));

  // Defensive lookup: normally every key exists in both languages (enforced
  // loosely by the TranslationKey type against `en`). But if a key is ever
  // present in en and missing in ar (or vice-versa), a raw
  // `translations[lang][key]` returns undefined — and undefined flowing
  // into places that expect a string (aria-labels, title attrs, .length,
  // etc.) is a plausible contributor to a language-switch render failure.
  // Fall back to the other language, then to the key name, so t() ALWAYS
  // returns a string.
  const t = (key: TranslationKey): string => {
    const primary = translations[lang]?.[key];
    if (typeof primary === "string") return primary;
    const fallback = translations[lang === "ar" ? "en" : "ar"]?.[key];
    if (typeof fallback === "string") return fallback;
    return key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}
