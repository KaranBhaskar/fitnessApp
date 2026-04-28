import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        plum: "#210440",
        peach: "#FDB095",
        rose: "#E5958E",
        honey: "#FFBA00",
        cream: "#FFF7F4",
        ink: "#1D2037",
      },
      boxShadow: {
        "soft-plum": "0 24px 60px rgba(33, 4, 64, 0.22)",
        "button": "0 8px 0 rgba(33, 4, 64, 0.2)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
