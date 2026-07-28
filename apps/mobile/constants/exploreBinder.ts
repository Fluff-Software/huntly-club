/** Explore binder rarity / category colours (Step 9). */

export type ExploreCardRarity = "common" | "uncommon" | "rare" | "very_rare" | string;

export const EXPLORE_RARITY_COLORS: Record<string, string> = {
  common: "#3B82F6",
  uncommon: "#2D8A4E",
  rare: "#7C5CFF",
  very_rare: "#9B4FD1",
};

/** Native card art pixel size (explore-card-bg.png). */
export const EXPLORE_CARD_ART_WIDTH = 682;
export const EXPLORE_CARD_ART_HEIGHT = 1024;
/** width / height — keep binder + reveal frames matched to the asset. */
export const EXPLORE_CARD_ART_ASPECT = EXPLORE_CARD_ART_WIDTH / EXPLORE_CARD_ART_HEIGHT;

export const EXPLORE_BINDER_PAGE_BG = "#1F2A24";
export const EXPLORE_BINDER_POCKET_BG = "#2A3A32";
export const EXPLORE_BINDER_SCREEN_BG = "#2D4A35";
