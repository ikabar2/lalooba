"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/translations";

// Persistent mobile bottom navigation — the standard native-app pattern for
// primary navigation on phones, where a top nav bar is out of thumb reach.
// Hidden from lg+ (`lg:hidden`) since the desktop header already covers
// this; shown only where it actually earns its screen space.
//
// Deliberately built with next/link (not router.push) so each tab is a real
// anchor: middle-click / long-press "open in new tab" work, and it's
// keyboard-focusable and announced as a link, not a generic button. The
// whole bar is a semantic <nav aria-label> landmark so screen-reader users
// can jump straight to it.

type NavItem = {
  href: string;
  labelKey: TranslationKey;
  icon: React.ReactNode;
  // How to decide if this tab is "current": some tabs own a whole subtree
  // (/messages/*), others should only light up on an exact match (/).
  match: (pathname: string) => boolean;
};

const items: NavItem[] = [
  {
    href: "/",
    labelKey: "bottomnav_home",
    match: (p) => p === "/",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    href: "/marketplace",
    labelKey: "bottomnav_browse",
    match: (p) => p === "/marketplace" || p.startsWith("/listing"),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    ),
  },
  {
    href: "/post",
    labelKey: "bottomnav_post",
    match: (p) => p === "/post",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/messages",
    labelKey: "bottomnav_messages",
    match: (p) => p.startsWith("/messages"),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
      </svg>
    ),
  },
  {
    href: "/account",
    labelKey: "bottomnav_account",
    match: (p) => p === "/account",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav
      aria-label="Primary mobile"
      // pb-safe-ish: extra bottom padding respects the iOS home-indicator
      // safe area so the bar isn't overlapped by the system gesture bar.
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-navy-100 bg-white/95 backdrop-blur-sm lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
                  active ? "text-gold-400" : "text-navy-500 hover:text-navy-800"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
