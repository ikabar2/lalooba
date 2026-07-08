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
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("lalooba-lang") as Lang | null;
      if (stored === "en" || stored === "ar") setLang(stored);
    } catch (err) {
      console.warn("[language] Couldn't read saved language preference:", err);
    }
  }, []);

  // Flip <html dir="..."> and persist whenever language changes
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try {
      window.localStorage.setItem("lalooba-lang", lang);
    } catch (err) {
      console.warn("[language] Couldn't save language preference:", err);
    }
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
