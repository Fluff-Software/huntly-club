import { Platform } from "react-native";

/* ------------------------------------------------------------------ *
 * Core palette (unchanged public tokens — safe for existing imports)  *
 * ------------------------------------------------------------------ */
export const SCAVENGER_BG = "#2D4A35";
export const SCAVENGER_CARD = "#3D5F45";
export const SCAVENGER_ACCENT = "#62A94F";
export const SCAVENGER_LIGHT = "#EEF5EE";
export const SCAVENGER_GREEN = "#4F6F52";
export const SCAVENGER_CHECK = "#2D5A27";
/** Matches OG Huntly warning tone (`colors.warning`). */
export const SCAVENGER_WARNING = "#E2A100";

/* ------------------------------------------------------------------ *
 * Extended palette for the refreshed look                             *
 * ------------------------------------------------------------------ */
/** Deep forest used at the foot of header gradients. */
export const SCAVENGER_BG_DEEP = "#1B3122";
/** Slightly lifted forest for elevated surfaces / card tops. */
export const SCAVENGER_CARD_TOP = "#456B4F";
/** Bright leaf used for glows and progress. */
export const SCAVENGER_LEAF_BRIGHT = "#7FCB63";
/** Warm adventure gold — trophies, in-progress, highlights. */
export const SCAVENGER_GOLD = "#F4C550";
export const SCAVENGER_GOLD_DEEP = "#E0A32E";
/** Hairline border that reads on the dark forest surfaces. */
export const SCAVENGER_HAIRLINE = "rgba(255,255,255,0.10)";
/** Soft text tones on dark backgrounds. */
export const SCAVENGER_TEXT_DIM = "rgba(255,255,255,0.72)";
export const SCAVENGER_TEXT_FAINT = "rgba(255,255,255,0.5)";

/* ------------------------------------------------------------------ *
 * Gradients (readonly tuples for expo-linear-gradient)                *
 * ------------------------------------------------------------------ */
export const SCAVENGER_HEADER_GRADIENT = ["#3C6248", "#233C2B"] as const;
export const SCAVENGER_SCREEN_GRADIENT = ["#2F4E38", "#1B3122"] as const;
export const SCAVENGER_CARD_GRADIENT = ["#456B4F", "#33533C"] as const;
export const SCAVENGER_CTA_GRADIENT = ["#6FBE55", "#3E7A3A"] as const;
export const SCAVENGER_GOLD_GRADIENT = ["#F7CE5E", "#E0A32E"] as const;
export const SCAVENGER_COMPLETE_GRADIENT = ["#3C6248", "#223C2B", "#14251A"] as const;
/** Bottom-up scrim laid over imagery so overlaid text stays legible. */
export const SCAVENGER_IMAGE_SCRIM = [
  "transparent",
  "rgba(20,37,26,0.15)",
  "rgba(20,37,26,0.85)",
] as const;

/* ------------------------------------------------------------------ *
 * Shared elevation presets                                            *
 * ------------------------------------------------------------------ */
export const scavengerShadow = {
  shadowColor: "#0C1A11",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.28,
  shadowRadius: 16,
  elevation: 6,
} as const;

export const scavengerSoftShadow = {
  shadowColor: "#0C1A11",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18,
  shadowRadius: 10,
  elevation: 3,
} as const;

/** A gold glow used to make celebratory elements pop. */
export const scavengerGoldGlow = {
  shadowColor: SCAVENGER_GOLD_DEEP,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: Platform.OS === "ios" ? 0.55 : 0.35,
  shadowRadius: 18,
  elevation: 8,
} as const;
