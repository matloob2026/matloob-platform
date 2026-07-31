import type { Config } from "tailwindcss";

/**
 * Brand tokens below are ported directly from the locked homepage
 * design (see the approved homepage HTML's :root CSS variables) so the
 * Admin Dashboard shares the exact same visual identity — navy/teal —
 * rather than inventing a separate admin theme.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0A1E46",
          900: "#163A6B",
          800: "#1C3F73",
          700: "#1E4A7A",
        },
        teal: {
          700: "#065A6E",
          600: "#087A8F",
          500: "#0C93A8",
          400: "#3FB3C4",
          300: "#7FC4CE",
          200: "#B9E3E8",
          100: "#E3F5F7",
          50: "#F2FAFB",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F5FAFB",
          dark: "#6184B1",
        },
        border: {
          DEFAULT: "#E1EDEF",
          strong: "#CFE3E6",
        },
        text: {
          900: "#0A1E46",
          700: "#33455F",
          500: "#647489",
          400: "#93A5B2",
        },
      },
      fontFamily: {
        sans: ["Tajawal", "sans-serif"],
        display: ["Cairo", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 10px 28px rgba(10,30,70,0.10)",
        "card-lg": "0 22px 50px -14px rgba(10,30,70,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
