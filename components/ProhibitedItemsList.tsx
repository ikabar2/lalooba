"use client";

import { useLanguage } from "@/lib/language-context";
import { PROHIBITED_ITEMS } from "@/lib/footer-content";

export default function ProhibitedItemsList() {
  const { lang } = useLanguage();

  return (
    <ul className="flex flex-col gap-2.5">
      {PROHIBITED_ITEMS.map((item) => (
        <li
          key={item.en}
          className="flex items-start gap-3 rounded-lg border border-navy-100 bg-white px-4 py-3"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mt-0.5 shrink-0 text-gold-200"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M4.93 4.93l14.14 14.14" />
          </svg>
          <span className="text-sm leading-relaxed text-navy-700">{item[lang]}</span>
        </li>
      ))}
    </ul>
  );
}
