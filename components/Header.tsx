"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "./Logo";
import { useLanguage } from "@/lib/language-context";
import { createClient } from "@/lib/supabase/client";
import { getDisplayName } from "@/lib/user-display";
import type { TranslationKey } from "@/lib/translations";

// Category values are translation keys, not display strings — this is what
// makes the dropdown itself translate, not just the label sitting next to
// it. The underlying `value` sent in the search URL stays in English
// (cat_clothing, cat_food, etc.) regardless of display language, so a
// search link works the same way no matter what language built it.
const categoryKeys: TranslationKey[] = [
  "cat_all",
  "cat_clothing",
  "cat_food",
  "cat_crafts",
  "cat_homemade",
  "cat_electronics",
  "cat_cars",
  "cat_barbershop",
  "cat_tax",
  "cat_bank",
  "cat_other",
];

// One emoji icon per category — used inline in the <select> options (native
// selects render emoji fine across browsers, no extra assets needed) and
// exported for reuse by the CategoryIconBar grid on the homepage for a more
// visual "browse by category" entry point.
export const categoryIcons: Record<string, string> = {
  cat_all: "🗂️",
  cat_clothing: "👕",
  cat_food: "🍲",
  cat_crafts: "💍", // Jewelry & Accessories (formerly Crafts)
  cat_homemade: "🥘",
  cat_electronics: "💻",
  cat_cars: "🚗",
  cat_barbershop: "📚", // Books, Arts & Gifts (formerly Barbershop)
  cat_tax: "🧘", // Health & Wellness (formerly Tax Filing)
  cat_bank: "🏦", // Bank Transfers / remittances — Sudan-relevant
  cat_other: "➕",
};

// Reads the current URL's ?q=/?category= and reports it up to Header's
// local state — this is what makes the search box and category dropdown
// actually reflect reality after a Back/Forward navigation, a shared link,
// or a page refresh, instead of always starting blank regardless of what
// URL you're actually on. Split into its own component and wrapped in
// <Suspense> (rather than calling useSearchParams() directly in Header)
// because useSearchParams() opts the component that calls it into
// per-request dynamic rendering — isolating it here means only this sliver
// bails out of static rendering, not the whole header on every page.
function HeaderSearchParamsSync({
  onSync,
}: {
  onSync: (query: string, category: TranslationKey) => void;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const cat = (searchParams.get("category") as TranslationKey | null) ?? categoryKeys[0];
    onSync(q, cat);
    // Re-run on every search-param change (not just mount) — this is what
    // keeps the header in sync when the user hits Back to a previous
    // search/filter state, not just on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);
  return null;
}

export default function Header({ detectedCity }: { detectedCity: string | null }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Holds enough to compute a display name — email as the fallback,
  // fullName from the *profiles* table (not just signup-time
  // user_metadata), so editing your name on /account actually changes what
  // shows up here without needing to re-authenticate.
  const [account, setAccount] = useState<{ email: string | null; fullName: string | null } | null>(
    null
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TranslationKey>(categoryKeys[0]);
  const { lang, toggleLang, t } = useLanguage();
  const displayName = account ? getDisplayName({ email: account.email, full_name: account.fullName }) : null;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function loadAccount(userId: string, email: string | null) {
      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, full_name")
          .eq("id", userId)
          .single();
        setAccount({
          email,
          fullName: profile?.display_name ?? profile?.full_name ?? null,
        });
        // Unread message count for the notification badge. Best-effort — a
        // failure here just means no badge, never a broken header.
        try {
          const { data: unread } = await supabase.rpc("unread_message_count");
          setUnreadCount(typeof unread === "number" ? unread : 0);
        } catch {
          setUnreadCount(0);
        }
      } catch {
        // profiles fetch failing (RLS hiccup, table not migrated yet, brief
        // network blip) shouldn't block showing *something* — fall back to
        // just the email until it succeeds.
        setAccount({ email, fullName: null });
      }
    }

    try {
      const supabase = createClient();
      supabase.auth
        .getUser()
        .then(({ data }) => {
          if (data.user) loadAccount(data.user.id, data.user.email ?? null);
          else {
            setAccount(null);
            setUnreadCount(0);
          }
        })
        .catch(() => setAccount(null)); // network hiccup on initial check — treat as logged out, not a crash

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) loadAccount(session.user.id, session.user.email ?? null);
        else {
          setAccount(null);
          setUnreadCount(0);
        }
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    } catch (err) {
      console.warn("[Header] Supabase auth check skipped:", err);
    }
    return () => unsubscribe?.();
  }, []);

  async function handleLogout() {
    // Clear local user state immediately so the UI reflects logout even if
    // the network call is slow.
    setAccount(null);
    setUnreadCount(0);
    try {
      const supabase = createClient();
      // scope: "global" invalidates the session everywhere (all this user's
      // devices/tabs), not just this browser — the safest default for a
      // "sign out" action. Clears the auth tokens from storage too.
      await supabase.auth.signOut({ scope: "global" });
    } catch (err) {
      console.warn("[Header] Logout error (redirecting home anyway):", err);
    } finally {
      // Always land on the homepage, logged out — even if signOut threw, we
      // don't want to strand the user on an authed page in a half-state. A
      // full navigation (not router.push) guarantees all cached React state
      // and any in-memory Supabase session are dropped.
      window.location.href = "/";
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category !== categoryKeys[0]) params.set("category", category);
    router.push(`/marketplace?${params.toString()}`);
    setMobileOpen(false);
  }

  function handlePostClick() {
    if (!account) {
      router.push("/login?redirect=/post");
      return;
    }
    router.push("/post");
  }

  const navLinks = [
    // Was "#marketplace" — a same-page anchor that only ever worked when
    // already on the homepage; clicking it from any other page (a listing,
    // /jeebli, /account, ...) silently did nothing, since there was no
    // navigation target, just a hash change with nowhere to scroll to on
    // the current page. There's a real /marketplace page now — use it.
    { label: t("nav_marketplace"), href: "/marketplace" },
    { label: t("nav_jobs"), href: "#jobs" },
    { label: t("nav_interpreters"), href: "#interpreters" },
    { label: t("nav_jeebli"), href: "/jeebli" },
    { label: t("nav_institutions"), href: "#institutions" },
  ];

  return (
    <>
      <Suspense fallback={null}>
        <HeaderSearchParamsSync
          onSync={(q, cat) => {
            setQuery(q);
            setCategory(cat);
          }}
        />
      </Suspense>
      <header className="sticky top-0 z-50 border-b border-navy-100 bg-white">
      {/* Top utility row — kept minimal on mobile: logo, language toggle,
          hamburger. Login moves into the mobile dropdown instead of
          competing for space in this row, which is the thing that was
          actually overflowing on small screens. */}
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-5">
        <Logo size="sm" />

        <nav aria-label="Primary" className="hidden gap-5 text-xs font-medium text-navy-600 lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-navy-900">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleLang}
            aria-label="Switch language"
            className="rounded-full border border-navy-100 bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-800 transition hover:bg-navy-100"
          >
            {lang === "en" ? "EN / عربي" : "عربي / EN"}
          </button>

          {/* Auth — visible inline from sm up, hidden on phones where it
              moves into the mobile menu below instead */}
          <div className="hidden items-center gap-2 sm:flex">
            {account ? (
              <>
                <Link
                  href="/messages"
                  aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : "Messages"}
                  className="relative rounded-md border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-900 transition hover:bg-navy-50"
                >
                  Messages
                  {unreadCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
                <Link href="/account" className="text-xs font-semibold text-navy-700 hover:underline">
                  {displayName}
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-md border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-900 transition hover:bg-navy-50"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link href="/login" className="text-xs font-semibold text-navy-900 hover:underline">
                {t("login")}
              </Link>
            )}
          </div>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-navy-100 text-navy-900 lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Search row — mobile-first: each control is full-width on its own
          row by default. At sm+, `sm:contents` removes the wrapper divs
          from layout so every control becomes a direct flex child of the
          same single-line row instead. Every label/placeholder/button text
          in this row routes through t() — this whole section was previously
          hardcoded English and didn't translate at all. */}
      <div className="border-t border-navy-50 bg-navy-50/40">
        <form
          onSubmit={handleSearch}
          className="mx-auto flex flex-col gap-2 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-5"
        >
          <div className="flex items-center gap-2 rounded-lg border border-navy-100 bg-white px-3 py-3 sm:min-w-0 sm:flex-1 sm:py-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-navy-400">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search_placeholder")}
              className="w-full min-w-0 text-sm text-navy-900 outline-none placeholder:text-navy-400"
            />
          </div>

          {/* Create account — sits right beside the search bar so it's seen
              immediately, not buried in the utility row or mobile menu.
              Only shown logged-out; a returning member doesn't need it. */}
          {!account && (
            <Link
              href="/signup"
              className="shrink-0 rounded-lg border-2 border-navy-900 bg-white px-5 py-3 text-center text-sm font-bold text-navy-900 transition hover:bg-navy-50 sm:py-2"
            >
              {t("create_account_button")}
            </Link>
          )}

          {/* Mobile: category + search button share a row. Desktop: this
              wrapper disappears and both become normal flex items. */}
          <div className="flex gap-2 sm:contents">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TranslationKey)}
              className="flex-1 rounded-lg border border-navy-100 bg-white px-3 py-3 text-sm text-navy-700 outline-none sm:flex-none sm:py-2"
            >
              {categoryKeys.map((key) => (
                <option key={key} value={key}>
                  {categoryIcons[key]} {t(key)}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-lg bg-navy-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-navy-800 sm:py-2"
            >
              {t("search_button")}
            </button>
          </div>

          {/* Mobile: location pill + Post button share the last row.
              Desktop: same flattening trick. */}
          <div className="flex items-center gap-2 sm:contents">
            <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-navy-100 bg-white px-3 py-3 text-sm text-navy-700 sm:flex-none sm:py-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <path d="M12 21s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <span className="truncate">{detectedCity ?? t("location_fallback")}</span>
            </div>

            <button
              type="button"
              onClick={handlePostClick}
              className="shrink-0 rounded-lg bg-gold-200 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-gold-100 sm:ml-auto sm:py-2"
            >
              + {t("post_button")}
            </button>
          </div>
        </form>
      </div>

      {mobileOpen && (
        <nav aria-label="Mobile" className="flex flex-col gap-1 border-t border-navy-100 bg-white px-4 py-3 lg:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-2 py-3 text-sm font-medium text-navy-700 hover:bg-navy-50"
            >
              {link.label}
            </Link>
          ))}

          {/* Auth links live here on phones instead of cramming the top
              utility row — visible only below sm, mirroring the inline
              version that's hidden at that size. */}
          <div className="mt-1 border-t border-navy-100 pt-2 sm:hidden">
            {account ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-1.5 text-xs font-semibold text-navy-700 hover:underline"
                >
                  {displayName}
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full rounded-md px-2 py-3 text-left text-sm font-medium text-navy-700 hover:bg-navy-50"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="block rounded-md px-2 py-3 text-sm font-medium text-navy-700 hover:bg-navy-50"
              >
                {t("login")}
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
      {/* Jump target for the skip-to-content link in app/layout.tsx. A
          plain anchor, not a heading or landmark, so it doesn't add a
          confusing extra "region" to screen-reader navigation — it exists
          purely so keyboard focus lands right after the header. */}
      <span id="main-content" tabIndex={-1} />
    </>
  );
}
