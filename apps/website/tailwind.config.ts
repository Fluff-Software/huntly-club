import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy semantic names, repointed to the new Huntly palette so every
        // existing page/component cascades to the rebrand with zero edits.
        // New code should prefer `brand.*` below instead of these names.
        huntly: {
          moss: "#173A2B",
          leaf: "#1E7F6E",
          sky: "#1E7F6E",
          clay: "#F74A5D",
          ochre: "#FFC14B",
          parchment: "#FBF6EE",
          stone: "#E4D9C0",
          slate: "#5B5647",
          forest: "#173A2B",
          success: "#1E7F6E",
          info: "#1E7F6E",
          alert: "#F74A5D",
        },
        brand: {
          coral: "#F74A5D",
          green: "#173A2B",
          gold: "#FFC14B",
          tan: "#EEC08A",
          beige: "#F3EAD9",
          pink: "#EA5C8F",
          teal: "#1E7F6E",
          cream: "#FBF6EE",
          muted: "#5B5647",
        },
      },
      fontFamily: {
        sans: ["var(--font-hanken)", "system-ui", "sans-serif"],
        display: ["var(--font-bricolage)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 45px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        xl: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;

