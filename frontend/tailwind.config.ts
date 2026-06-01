import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        ocean: "#2563eb",
        mist: "#f8fafc"
      },
      boxShadow: {
        soft: "0 12px 32px rgba(15, 23, 42, 0.09)"
      }
    }
  },
  plugins: []
} satisfies Config;
