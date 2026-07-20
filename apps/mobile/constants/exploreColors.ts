import type { Database } from "@/models/supabase";

export type ExploreCollectibleRarity = Database["public"]["Enums"]["explore_collectible_rarity"];

/** Fresh, not-yet-visited world-map POI marker/radius color. */
export const EXPLORE_POI_UNDISCOVERED_COLOR = "#4F6F52";
/** Already-discovered world-map POI marker/radius color — dimmer, still visible. */
export const EXPLORE_POI_DISCOVERED_COLOR = "#8FA893";

export const EXPLORE_RARITY_COLORS: Record<ExploreCollectibleRarity, string> = {
  common: "#7A8B7D",
  uncommon: "#2D8A4E",
  rare: "#3E63C9",
  epic: "#9B4FD1",
  legendary: "#D9A21B",
};

export const EXPLORE_RARITY_LABELS: Record<ExploreCollectibleRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

/** Used for a card's category chip/tag when its `explore_collectible_categories` row has no `color`. */
export const EXPLORE_CATEGORY_FALLBACK_COLOR = "#6B7280";

/** Accent color for the shiny (foil) sparkle badge and reveal-screen flourishes. */
export const EXPLORE_SHINY_GLOW_COLOR = "#FFD700";

/** Gradient stops for the holographic sheen overlay on `ExploreCard`, brightened further when shiny. */
export const EXPLORE_SHEEN_GRADIENT = ["rgba(255,255,255,0)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0)"] as const;
export const EXPLORE_SHINY_SHEEN_GRADIENT = [
  "rgba(255,255,255,0)",
  "rgba(255,215,0,0.85)",
  "rgba(120,200,255,0.6)",
  "rgba(255,255,255,0)",
] as const;
