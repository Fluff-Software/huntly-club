/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Huntly World brand colors based on design images
        huntly: {
          // Primary greens from nature theme
          forest: "rgb(var(--huntly-forest) / <alpha-value>)", // Dark green for headers and navigation
          leaf: "rgb(var(--huntly-leaf) / <alpha-value>)", // Medium green for cards and accents
          sage: "rgb(var(--huntly-sage) / <alpha-value>)", // Light green for backgrounds
          mint: "rgb(var(--huntly-mint) / <alpha-value>)", // Very light green for subtle backgrounds

          // Warm yellows and oranges
          sunshine: "rgb(var(--huntly-sunshine) / <alpha-value>)", // Bright yellow for highlights
          amber: "rgb(var(--huntly-amber) / <alpha-value>)", // Orange for buttons and CTAs
          peach: "rgb(var(--huntly-peach) / <alpha-value>)", // Light orange for backgrounds

          // Blues for sky and water themes
          sky: "rgb(var(--huntly-sky) / <alpha-value>)", // Light blue for backgrounds
          ocean: "rgb(var(--huntly-ocean) / <alpha-value>)", // Medium blue for accents
          navy: "rgb(var(--huntly-navy) / <alpha-value>)", // Dark blue for text

          // Neutral colors
          cream: "rgb(var(--huntly-cream) / <alpha-value>)", // Light cream for backgrounds
          brown: "rgb(var(--huntly-brown) / <alpha-value>)", // Earth brown for text and borders
          charcoal: "rgb(var(--huntly-charcoal) / <alpha-value>)", // Dark gray for text
        },

        // Team colors from the design
        team: {
          fox: "#FF6B35", // Orange for Fox team
          bear: "#8B4513", // Brown for Bear team
          otter: "#4682B4", // Blue for Otter team
        },

        // Profile color options for avatars
        profile: {
          1: "#FF6B35", // team-fox
          2: "#8B4513", // team-bear
          3: "#4682B4", // team-otter
          4: "#4A7C59", // huntly-leaf
          5: "#7FB069", // huntly-sage
          6: "#FFA500", // huntly-amber
          7: "#FFD93D", // huntly-sunshine
          8: "#87CEEB", // huntly-sky
          9: "#A8D5BA", // huntly-mint
          10: "#FFB347", // huntly-peach
        },
      },
      fontFamily: {
        rounded: ["System", "sans-serif"], // Rounded, friendly font for kids
        jua: ["Jua_400Regular", "sans-serif"], // Jua for buttons and headings
        "comic-neue": ["ComicNeue_400Regular", "sans-serif"], // Comic Neue for body copy
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        soft: "0 4px 12px rgba(0, 0, 0, 0.1)",
        medium: "0 6px 20px rgba(0, 0, 0, 0.15)",
        "soft-sm": "0 2px 8px rgba(0, 0, 0, 0.08)",
      },
      animation: {
        spin: "spin 1s linear infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        bounce: "bounce 1s infinite",
      },
      keyframes: {
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        bounce: {
          "0%, 100%": {
            transform: "translateY(-25%)",
            animationTimingFunction: "cubic-bezier(0.8, 0, 1, 1)",
          },
          "50%": {
            transform: "translateY(0)",
            animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
          },
        },
      },
    },
  },
  plugins: [],
};
