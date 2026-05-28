import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
      },
      // Default focus/ring color is brand orange so any stray `ring-*` or
      // focus ring falls back to orange instead of the browser/Tailwind blue.
      ringColor: {
        DEFAULT: "#f97316",
      },
      fontFamily: {
        // Single typeface across the whole app. `font-mono` is aliased to the
        // same sans stack so existing `font-mono tabular-nums` callsites keep
        // their column alignment without rendering in a different family.
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial"],
        mono: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial"],
      },
    },
  },
  plugins: [],
};
export default config;
