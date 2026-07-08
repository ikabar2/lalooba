import Link from "next/link";

type LogoProps = {
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { box: 30, icon: 18, name: "text-base", arabic: "text-sm", pad: "px-2.5 py-1.5" },
  md: { box: 40, icon: 24, name: "text-xl", arabic: "text-base", pad: "px-3.5 py-2" },
  lg: { box: 56, icon: 32, name: "text-3xl", arabic: "text-xl", pad: "px-5 py-3" },
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
        <svg width={s.icon} height={s.icon} viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="14" r="6" fill="#FF4500" />
          <circle cx="52" cy="32" r="6" fill="#FF4500" />
          <circle cx="32" cy="50" r="6" fill="#FF4500" />
          <circle cx="12" cy="32" r="6" fill="#FF4500" />
          <circle cx="32" cy="32" r="8" fill="none" stroke="#FF4500" strokeWidth="4" />
        </svg>
      </div>
      <span className="flex items-baseline gap-2">
        <span className={`font-bold text-navy-900 ${s.name}`}>Lalooba</span>
        <span className={`arabic font-bold text-gold-400 ${s.arabic}`}>لالوبا</span>
      </span>
    </Link>
  );
}
