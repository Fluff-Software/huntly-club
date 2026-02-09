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
          forest: "#2D5A27",
          leaf: "#4A7C59",
          sage: "#7FB069",
          mint: "#A8D5BA",
          cream: "#FFF8DC",
          brown: "#8B4513",
          charcoal: "#36454F",
        },
      },
    },
  },
  plugins: [],
};

export default config;
