/**
 * Huntly Club color scheme - maps to Tailwind classes
 * All colors should be used via Tailwind classes for consistency
 */

// Profile color options mapped to Tailwind classes
// These are used for dynamic color selection in profiles
export const PROFILE_COLOR_OPTIONS = [
  { value: "bg-profile-1", tailwindClass: "bg-profile-1", label: "Fox Orange" },
  { value: "bg-profile-2", tailwindClass: "bg-profile-2", label: "Bear Brown" },
  { value: "bg-profile-3", tailwindClass: "bg-profile-3", label: "Otter Blue" },
  { value: "bg-profile-4", tailwindClass: "bg-profile-4", label: "Leaf Green" },
  { value: "bg-profile-5", tailwindClass: "bg-profile-5", label: "Sage Green" },
  { value: "bg-profile-6", tailwindClass: "bg-profile-6", label: "Amber" },
  { value: "bg-profile-7", tailwindClass: "bg-profile-7", label: "Sunshine" },
  { value: "bg-profile-8", tailwindClass: "bg-profile-8", label: "Sky Blue" },
  { value: "bg-profile-9", tailwindClass: "bg-profile-9", label: "Mint" },
  { value: "bg-profile-10", tailwindClass: "bg-profile-10", label: "Peach" },
] as const;

// Map Tailwind classes to hex values for database storage
export const TAILWIND_TO_HEX: Record<string, string> = {
  "bg-profile-1": "#FF6B35",
  "bg-profile-2": "#8B4513",
  "bg-profile-3": "#4682B4",
  "bg-profile-4": "#4A7C59",
  "bg-profile-5": "#7FB069",
  "bg-profile-6": "#FFA500",
  "bg-profile-7": "#FFD93D",
  "bg-profile-8": "#87CEEB",
  "bg-profile-9": "#A8D5BA",
  "bg-profile-10": "#FFB347",
};

// Map hex values to Tailwind classes for displaying from database
export const HEX_TO_TAILWIND: Record<string, string> = {
  "#FF6B35": "bg-profile-1",
  "#8B4513": "bg-profile-2",
  "#4682B4": "bg-profile-3",
  "#4A7C59": "bg-profile-4",
  "#7FB069": "bg-profile-5",
  "#FFA500": "bg-profile-6",
  "#FFD93D": "bg-profile-7",
  "#87CEEB": "bg-profile-8",
  "#A8D5BA": "bg-profile-9",
  "#FFB347": "bg-profile-10",
};

// Helper function to get hex value from Tailwind class
export function getTailwindColorHex(tailwindClass: string): string {
  return TAILWIND_TO_HEX[tailwindClass] || "#4A7C59"; // Default to leaf green
}

// Helper function to get Tailwind class from hex value
export function getHexColorTailwind(hex: string): string {
  return HEX_TO_TAILWIND[hex] || "bg-profile-4"; // Default to leaf green
}

// Legacy support - for components that haven't been migrated yet
const tintColorLight = "#4A7C59"; // huntly-leaf
const tintColorDark = "#7FB069"; // huntly-sage

export const Colors = {
  light: {
    text: "#2D5A27",
    background: "#FFF8DC",
    tint: tintColorLight,
    icon: "#8B4513",
    tabIconDefault: "#8B4513",
    tabIconSelected: tintColorLight,
    primary: "#4A7C59",
    secondary: "#FFA500",
    accent: "#FFD93D",
    surface: "#A8D5BA",
    card: "#FFFFFF",
    border: "#7FB069",
  },
  dark: {
    text: "#A8D5BA",
    background: "#2D5A27",
    tint: tintColorDark,
    icon: "#7FB069",
    tabIconDefault: "#7FB069",
    tabIconSelected: tintColorDark,
    primary: "#7FB069",
    secondary: "#FFB347",
    accent: "#FFD93D",
    surface: "#4A7C59",
    card: "#36454F",
    border: "#4A7C59",
  },
};

// Type exports
export type ProfileColorOption = typeof PROFILE_COLOR_OPTIONS[number];