import Link from "next/link";

type LogoProps = {
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { box: 30, icon: 18, name: "text-lg", arabic: "text-base", pad: "px-2.5 py-1.5" },
  md: { box: 40, icon: 24, name: "text-2xl", arabic: "text-xl", pad: "px-3.5 py-2" },
  lg: { box: 56, icon: 32, name: "text-4xl", arabic: "text-2xl", pad: "px-5 py-3" },
};

export default function Logo({ size = "sm" }: LogoProps) {
  const s = sizes[size];

  return (
    <Link
      href="/"
      aria-label="Lalooba home"
      className={`flex items-center gap-3 rounded-full border border-navy-100 bg-navy-50/80 shadow-sm transition hover:border-gold-200/50 hover:bg-navy-50 ${s.pad}`}
    >
      <div
        className="flex shrink-0 items-center justify-center rounded-lg bg-navy-900 shadow-sm"
        style={{ width: s.box, height: s.box }}
      >
        <svg width={s.icon} height={s.icon} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          {/* Laloob (desert date) tree — the Sudanese tree Lalooba is named
              for. Canopy = growth/provision, rooted base = community. */}
          <circle cx="16" cy="12" r="8.5" fill="none" stroke="#FF4500" strokeWidth="2.6" />
          <circle cx="16" cy="12" r="3" fill="#FF4500" />
          <path d="M16 20.5 V27" stroke="#FF4500" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M11 27 H21" stroke="#FF4500" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </div>
      <span className="flex items-baseline gap-2">
        <span className={`font-bold tracking-tight text-navy-900 ${s.name}`}>Lalooba</span>
        <span className={`arabic font-black text-gold-400 ${s.arabic}`} style={{ fontWeight: 900 }}>لالوبة</span>
      </span>
    </Link>
  );
}
