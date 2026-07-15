"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { primeSupabaseConfig } from "./supabase/client";
import { translations, Lang, TranslationKey } from "./translations";

type LanguageContextValue = {
  lang: Lang;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLang = "en",
}: {
  children: React.ReactNode;
  initialLang?: Lang;
}) {
  // Seeded from the SSR-read cookie so the server-rendered dir and the first
  // client render agree — no hydration mismatch, no LTR→RTL flip.
  const [lang, setLang] = useState<Lang>(initialLang);

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
    // Prime Supabase config from the runtime endpoint as early as possible.
    // If build-time inlining of NEXT_PUBLIC_* succeeded this is a no-op; if it
    // didn't, this seeds the module cache so every createClient() call across
    // the app returns a working client instead of null — without crashing.
    primeSupabaseConfig();

    try {
      const crashedLastTime = window.sessionStorage.getItem("lalooba-lang-pending") === "ar";
      if (crashedLastTime) {
        window.sessionStorage.removeItem("lalooba-lang-pending");
        window.localStorage.setItem("lalooba-lang", "en");
        setLang("en");
        return;
      }
      // One-time migration: users from before cookie persistence have their
      // preference only in localStorage. If the cookie is absent but storage
      // has a value, adopt it (and the change-effect below writes the cookie
      // so SSR gets it right from the next request on).
      const hasCookie = document.cookie.includes("lalooba-lang=");
      const stored = window.localStorage.getItem("lalooba-lang") as Lang | null;
      if (!hasCookie && (stored === "en" || stored === "ar")) setLang(stored);
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

    // Keep html attributes for assistive tech / :lang() — note the LAYOUT
    // direction of the root is pinned to LTR in globals.css regardless (see
    // the Android Chromium note there); the visual RTL lives on the
    // .main-layout-wrapper rendered below.
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

    // Cookie is the SSR source of truth (server components can read it and
    // render dir at first paint). localStorage kept in sync for the crash
    // self-heal marker logic and old-version compatibility.
    try {
      document.cookie = `lalooba-lang=${lang}; path=/; max-age=31536000; samesite=lax`;
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
      {/* The ONLY element that carries the visual direction. The browser's
          root scroll context (html/body) stays LTR (globals.css) so Android
          Chromium can't inflate the layout viewport from negative-X
          absolutes under RTL; everything the user sees flows RTL from here
          down via normal CSS direction inheritance. */}
      <div className="main-layout-wrapper" dir={lang === "ar" ? "rtl" : "ltr"}>
        {children}
      </div>
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
