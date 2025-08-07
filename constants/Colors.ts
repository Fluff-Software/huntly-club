/**
 * Huntly Club color scheme based on nature-inspired design
 * Colors are defined for both light and dark modes
 */

const tintColorLight = "#4A7C59"; // huntly-leaf
const tintColorDark = "#7FB069"; // huntly-sage

export const Colors = {
  light: {
    text: "#2D5A27", // huntly-forest
    background: "#FFF8DC", // huntly-cream
    tint: tintColorLight,
    icon: "#8B4513", // huntly-brown
    tabIconDefault: "#8B4513", // huntly-brown
    tabIconSelected: tintColorLight,
    // Additional theme colors
    primary: "#4A7C59", // huntly-leaf
    secondary: "#FFA500", // huntly-amber
    accent: "#FFD93D", // huntly-sunshine
    surface: "#A8D5BA", // huntly-mint
    card: "#FFFFFF",
    border: "#7FB069", // huntly-sage
  },
  dark: {
    text: "#A8D5BA", // huntly-mint
    background: "#2D5A27", // huntly-forest
    tint: tintColorDark,
    icon: "#7FB069", // huntly-sage
    tabIconDefault: "#7FB069", // huntly-sage
    tabIconSelected: tintColorDark,
    // Additional theme colors
    primary: "#7FB069", // huntly-sage
    secondary: "#FFB347", // huntly-peach
    accent: "#FFD93D", // huntly-sunshine
    surface: "#4A7C59", // huntly-leaf
    card: "#36454F", // huntly-charcoal
    border: "#4A7C59", // huntly-leaf
  },
};
