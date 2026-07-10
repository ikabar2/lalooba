"use client";

import Link from "next/link";
import Logo from "./Logo";
import { useLanguage } from "@/lib/language-context";

export default function Footer() {
  const { lang, toggleLang } = useLanguage();

  const columns = [
    {
      title: "Platform",
      links: [
        { label: "Marketplace", href: "/marketplace" },
        { label: "Delivery Service", href: "/jeebli" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "How it works", href: "/how-it-works" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Trust & safety",
      links: [
        { label: "Verification", href: "/verification" },
        { label: "Dispute resolution", href: "/disputes" },
        { label: "Prohibited items", href: "/prohibited-items" },
        { label: "Privacy policy", href: "/privacy" },
      ],
    },
  ];

  return (
    <footer className="border-t border-navy-100 bg-navy-900">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-4 inline-block">
              <Logo size="sm" />
            </div>
            <p className="mb-4 max-w-xs text-sm leading-relaxed text-navy-200">
              A free community marketplace and travel logistics platform —
              built for diaspora communities across Canada and the United
              States.
            </p>

            <div className="flex items-center gap-2.5">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Lalooba on Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-navy-200 transition hover:border-gold-200/50 hover:text-gold-100"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.86c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z" />
                </svg>
              </a>

              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Lalooba on YouTube"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-navy-200 transition hover:border-gold-200/50 hover:text-gold-100"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.51 3.5 12 3.5 12 3.5s-7.51 0-9.38.55A3.02 3.02 0 00.5 6.19 31.6 31.6 0 000 12a31.6 31.6 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.87.55 9.38.55 9.38.55s7.51 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.6 31.6 0 0024 12a31.6 31.6 0 00-.5-5.81zM9.6 15.6V8.4l6.5 3.6-6.5 3.6z" />
                </svg>
              </a>

              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Lalooba on TikTok"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-navy-200 transition hover:border-gold-200/50 hover:text-gold-100"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.6 5.82c-1.02-.71-1.66-1.85-1.74-3.07h-3.05v13.2c0 1.53-1.24 2.77-2.77 2.77a2.77 2.77 0 01-2.77-2.77 2.77 2.77 0 012.77-2.77c.27 0 .53.04.78.11v-3.1a5.8 5.8 0 00-.78-.05A5.85 5.85 0 003 15.85a5.85 5.85 0 005.85 5.85 5.85 5.85 0 005.85-5.85V9.4a7.5 7.5 0 004.3 1.36V7.7c-.91 0-1.78-.28-2.5-.78a4.6 4.6 0 01-.5-1.1z" />
                </svg>
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-white/70">
                {col.title}
              </p>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-navy-200 transition hover:text-gold-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="my-8 h-px bg-navy-800" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-white/70">
            © {new Date().getFullYear()} Lalooba. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleLang}
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-navy-200 transition hover:border-gold-200/50 hover:text-gold-100"
            >
              {lang === "en" ? "العربية" : "English"}
            </button>
            <span className="flex items-center gap-1.5 text-xs text-white/70">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Verified sellers
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
