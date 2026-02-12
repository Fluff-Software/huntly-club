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
          moss: "#4F6F52",
          leaf: "#7FAF8A",
          sky: "#8FB8C9",
          clay: "#C58B68",
          ochre: "#E6C36A",
          parchment: "#F6F5F1",
          stone: "#D9D8D4",
          slate: "#5F6468",
          forest: "#2F3336",
          success: "#6FAE8F",
          info: "#7FAAC2",
          alert: "#C97A6A"
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

