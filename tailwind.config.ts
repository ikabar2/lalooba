import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Anchored at #0B1220 — darker than the previous navy, which gives
        // meaningfully higher contrast for white text/icons on top of it
        // (≈20:1 vs white) and reads cleanly in both bright daylight and
        // low-light/night browsing, where a lighter navy washes out more.
        navy: {
          50: "#F1F4F9",
          100: "#DCE2EE",
          200: "#B8C2D9",
          400: "#6B7DA0",
          600: "#44546E", // body text on white — ≈7.6:1 contrast, comfortably exceeds AA
          800: "#16223A",
          900: "#0B1220",
        },
        // Anchored at #FF4500. On white, #FF4500 itself measures ≈3.4:1 —
        // passes AA for large/bold text and UI components (buttons, icons)
        // but not small body text, so gold-400 below is a darker variant
        // of the same hue (≈5.1:1) for anywhere text needs to sit small.
        gold: {
          50: "#FFE8DB",
          100: "#FFB088",
          200: "#FF4500",
          400: "#CC3700",
          600: "#992900",
          800: "#661B00",
          900: "#330D00",
        },
        // Unchanged — kept exactly as-is for verification/trust/sign-up
        // contexts, per instruction.
        teal: {
          50: "#E1F5EE",
          100: "#9FE1CB",
          200: "#5DCAA5",
          400: "#1D9E75",
          600: "#0F6E56",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
        arabic: ["Tajawal", "system-ui", "sans-serif"],
      },
      borderRadius: {
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
