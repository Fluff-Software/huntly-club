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
