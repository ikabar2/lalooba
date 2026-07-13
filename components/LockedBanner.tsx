"use client";

import { useLanguage } from "@/lib/language-context";

// Formerly a guest-only "sign up" nudge (whose CTA didn't even link
// anywhere). Now a trust strip shown to every visitor: the three concrete
// reasons to feel safe using Lalooba. Same component name and placement so
// nothing upstream changes.
export default function LockedBanner() {
  const { t } = useLanguage();

  const items: { icon: React.ReactNode; title: string; desc: string }[] = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
      title: t("trust_verified_title"),
      desc: t("trust_verified_desc"),
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M21 11.5a8.38 8.38 0 01-9 8.35 8.5 8.5 0 01-3.4-.7L3 20l1.35-4.05A8.38 8.38 0 013 11.5a8.5 8.5 0 018.5-8.5 8.38 8.38 0 018.35 9z" />
        </svg>
      ),
      title: t("trust_messaging_title"),
      desc: t("trust_messaging_desc"),
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 21s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      ),
      title: t("trust_local_title"),
      desc: t("trust_local_desc"),
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 pb-7">
      <div className="grid gap-3 rounded-xl border border-navy-100 bg-white p-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
              {item.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-900">{item.title}</p>
              <p className="text-xs leading-relaxed text-navy-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
