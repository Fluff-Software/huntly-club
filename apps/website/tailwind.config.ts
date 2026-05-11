import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        huntly: {
          moss: "#3F5644",
          leaf: "#5F8768",
          sky: "#5D7C91",
          clay: "#9A6B50",
          ochre: "#B88E3E",
          parchment: "#F1EEE7",
          stone: "#C9C3B8",
          slate: "#495057",
          forest: "#22282D",
          success: "#4F7F62",
          info: "#557A92",
          alert: "#A85C4D"
        },
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "system-ui", "sans-serif"],
        display: ["var(--font-nunito)", "system-ui", "sans-serif"],
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

