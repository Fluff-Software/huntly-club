/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Huntly Club brand colors based on design images
        huntly: {
          // Primary greens from nature theme
          forest: "#2D5A27", // Dark green for headers and navigation
          leaf: "#4A7C59", // Medium green for cards and accents
          sage: "#7FB069", // Light green for backgrounds
          mint: "#A8D5BA", // Very light green for subtle backgrounds

          // Warm yellows and oranges
          sunshine: "#FFD93D", // Bright yellow for highlights
          amber: "#FFA500", // Orange for buttons and CTAs
          peach: "#FFB347", // Light orange for backgrounds

          // Blues for sky and water themes
          sky: "#87CEEB", // Light blue for backgrounds
          ocean: "#4682B4", // Medium blue for accents
          navy: "#1E3A8A", // Dark blue for text

          // Neutral colors
          cream: "#FFF8DC", // Light cream for backgrounds
          brown: "#8B4513", // Earth brown for text and borders
          charcoal: "#36454F", // Dark gray for text
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
