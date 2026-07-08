"use client";

import ScrollReveal from "./ScrollReveal";
import { useLanguage } from "@/lib/language-context";

export default function ModuleCards() {
  const { t } = useLanguage();

  const modules = [
    { name: t("nav_marketplace"), desc: t("module_marketplace_desc"), icon: "🛍", href: "#marketplace" },
    { name: t("nav_jobs"), desc: t("module_jobs_desc"), icon: "💼", href: "#jobs" },
    { name: t("nav_interpreters"), desc: t("module_interpreters_desc"), icon: "🌐", href: "#interpreters" },
    { name: t("nav_jeebli"), desc: t("module_jeebli_desc"), icon: "✈️", href: "#jeebli" },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 pb-12">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {modules.map((m, i) => (
          <ScrollReveal key={m.href} delay={i * 80}>
            <a
              href={m.href}
              className="block rounded-xl border border-navy-100 bg-white px-4 py-7 text-center transition-all duration-300 hover:-translate-y-1.5 hover:border-gold-200/40 hover:shadow-lg hover:shadow-navy-900/8"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-xl">
                {m.icon}
              </div>
              <p className="text-sm font-bold text-navy-900">{m.name}</p>
              <p className="text-xs text-navy-600">{m.desc}</p>
            </a>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
