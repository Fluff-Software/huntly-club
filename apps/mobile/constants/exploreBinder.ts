/** Explore binder rarity / category colours (Step 9). */

export type ExploreCardRarity = "common" | "uncommon" | "rare" | "very_rare" | string;

export const EXPLORE_RARITY_COLORS: Record<string, string> = {
  common: "#3B82F6",
  uncommon: "#2D8A4E",
  rare: "#9B4FD1",
  very_rare: "#C4851A",
};

/** Native card art pixel size (explore-card-bg.png). */
export const EXPLORE_CARD_ART_WIDTH = 682;
export const EXPLORE_CARD_ART_HEIGHT = 1024;
/** width / height — keep binder + reveal frames matched to the asset. */
export const EXPLORE_CARD_ART_ASPECT = EXPLORE_CARD_ART_WIDTH / EXPLORE_CARD_ART_HEIGHT;

/** Charcoal album page (half open zip-binder look). */
export const EXPLORE_BINDER_SCREEN_BG = "#0C0C0E";
export const EXPLORE_BINDER_PAGE_BG = "#161618";
export const EXPLORE_BINDER_POCKET_BG = "#1C1C1F";
export const EXPLORE_BINDER_SPINE = "#0A0A0C";
export const EXPLORE_BINDER_SEAL = "#0E0E10";
