/**
 * Pure helpers for the Explore card binder (Step 9).
 */

export type BinderCategoryFilter = "all" | "animal" | "habitat" | "flora_wildlife";

export type BinderCardEntry = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  imageUrl: string | null;
  sortOrder: number;
  habitatWeights: Record<string, number>;
  count: number;
  collected: boolean;
  firstCollectedAt: string | null;
  lastCollectedAt: string | null;
  /**
   * Nicknames of household players who own this card.
   * Only set on the merged "All players" binder view.
   */
  collectedBy?: string[];
};

export const BINDER_CATEGORY_LABELS: Record<Exclude<BinderCategoryFilter, "all">, string> = {
  animal: "Animals",
  habitat: "Habitats",
  flora_wildlife: "Flora & Wildlife",
};

export const BINDER_FILTERS: { id: BinderCategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "animal", label: "Animals" },
  { id: "habitat", label: "Habitats" },
  { id: "flora_wildlife", label: "Flora & Wildlife" },
];

export const PHONE_CARDS_PER_PAGE = 9; // 3×3
export const TABLET_CARDS_PER_PAGE = 9; // 3×3

export function cardsPerPageForLayout(_isTablet: boolean): number {
  return TABLET_CARDS_PER_PAGE;
}

export type BinderSortOption = "default" | "name_asc" | "name_desc" | "rarity" | "recent";

export const BINDER_SORT_OPTIONS: { id: BinderSortOption; label: string }[] = [
  { id: "default", label: "Binder order" },
  { id: "name_asc", label: "Name A–Z" },
  { id: "name_desc", label: "Name Z–A" },
  { id: "rarity", label: "Rarest first" },
  { id: "recent", label: "Recently found" },
];

const RARITY_RANK: Record<string, number> = {
  very_rare: 0,
  rare: 1,
  uncommon: 2,
  common: 3,
};

export function sortBinderCards(cards: BinderCardEntry[]): BinderCardEntry[] {
  return [...cards].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
}

export function sortBinderCardsBy(
  cards: BinderCardEntry[],
  sort: BinderSortOption
): BinderCardEntry[] {
  if (sort === "default") return sortBinderCards(cards);
  if (sort === "name_asc") {
    return [...cards].sort((a, b) => a.name.localeCompare(b.name));
  }
  if (sort === "name_desc") {
    return [...cards].sort((a, b) => b.name.localeCompare(a.name));
  }
  if (sort === "rarity") {
    return [...cards].sort((a, b) => {
      const ra = RARITY_RANK[a.rarity] ?? 99;
      const rb = RARITY_RANK[b.rarity] ?? 99;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
  }
  // recent — collected first by lastCollectedAt desc, then missing by binder order
  return [...cards].sort((a, b) => {
    const at = a.lastCollectedAt ? new Date(a.lastCollectedAt).getTime() : 0;
    const bt = b.lastCollectedAt ? new Date(b.lastCollectedAt).getTime() : 0;
    if (at !== bt) return bt - at;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
}

export function filterBinderCards(
  cards: BinderCardEntry[],
  filter: BinderCategoryFilter
): BinderCardEntry[] {
  const sorted = sortBinderCards(cards);
  if (filter === "all") return sorted;
  return sorted.filter((c) => c.category === filter);
}

export function pageCount(totalCards: number, perPage: number): number {
  if (perPage <= 0) return 0;
  if (totalCards <= 0) return 1;
  return Math.ceil(totalCards / perPage);
}

export function paginateBinderCards(
  cards: BinderCardEntry[],
  perPage: number
): BinderCardEntry[][] {
  const pages: BinderCardEntry[][] = [];
  const n = Math.max(1, pageCount(cards.length, perPage));
  for (let i = 0; i < n; i++) {
    pages.push(cards.slice(i * perPage, (i + 1) * perPage));
  }
  return pages;
}

/** Zero-based page index containing the card, or -1 if not found. */
export function pageIndexForCardId(
  cards: BinderCardEntry[],
  cardId: string,
  perPage: number
): number {
  const index = cards.findIndex((c) => c.id === cardId);
  if (index < 0 || perPage <= 0) return -1;
  return Math.floor(index / perPage);
}

export function canGoPreviousPage(pageIndex: number): boolean {
  return pageIndex > 0;
}

export function canGoNextPage(pageIndex: number, totalPages: number): boolean {
  return totalPages > 0 && pageIndex < totalPages - 1;
}

export function uniqueCollectedCount(cards: BinderCardEntry[]): number {
  return cards.filter((c) => c.collected || c.count > 0).length;
}

export function totalCopyCount(cards: BinderCardEntry[]): number {
  return cards.reduce((sum, c) => sum + Math.max(0, c.count), 0);
}

export function completionPercent(uniqueCollected: number, totalActive: number): number {
  if (totalActive <= 0) return 0;
  return Math.round((uniqueCollected / totalActive) * 100);
}

export function binderPocketAccessibilityLabel(card: BinderCardEntry): string {
  const rarity = card.rarity.replace(/_/g, " ");
  if (card.collected || card.count > 0) {
    const copies = card.count > 1 ? `, ${card.count} copies` : ", 1 copy";
    return `${card.name}, collected${copies}, ${rarity}`;
  }
  return `${card.name}, not discovered, ${rarity}`;
}

export const HABITAT_AFFINITY_LABELS: Record<string, string> = {
  freshwater: "Freshwater",
  wetland: "Wetland",
  woodland: "Woodland",
  grassland: "Grassland",
  farmland: "Farmland",
  urban: "Town & urban",
  park_garden: "Parks & gardens",
  coastal: "Coastal",
  general: "General",
};

export function readableHabitatAffinities(
  weights: Record<string, number>
): { key: string; label: string; strength: number }[] {
  return Object.entries(weights)
    .filter(([, w]) => typeof w === "number" && w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, strength]) => ({
      key,
      label: HABITAT_AFFINITY_LABELS[key] ?? key.replace(/_/g, " "),
      strength,
    }));
}

export function formatRarityLabel(rarity: string): string {
  return rarity
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/** Ownership / discovery filter for the binder grid. */
export type BinderStatusFilter = "all" | "collected" | "missing";

export const BINDER_STATUS_FILTERS: { id: BinderStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "collected", label: "Collected" },
  { id: "missing", label: "Missing" },
];

export function filterBinderByStatus(
  cards: BinderCardEntry[],
  status: BinderStatusFilter
): BinderCardEntry[] {
  if (status === "all") return cards;
  if (status === "collected") {
    return cards.filter((c) => c.collected || c.count > 0);
  }
  return cards.filter((c) => !c.collected && c.count <= 0);
}

export function filterBinderCardsFull(
  cards: BinderCardEntry[],
  category: BinderCategoryFilter,
  status: BinderStatusFilter = "all",
  sort: BinderSortOption = "default"
): BinderCardEntry[] {
  const byCategory =
    category === "all" ? cards : cards.filter((c) => c.category === category);
  return sortBinderCardsBy(filterBinderByStatus(byCategory, status), sort);
}

export function binderFiltersAreActive(
  category: BinderCategoryFilter,
  status: BinderStatusFilter,
  sort: BinderSortOption
): boolean {
  return category !== "all" || status !== "all" || sort !== "default";
}

export type CategoryProgress = {
  category: Exclude<BinderCategoryFilter, "all">;
  label: string;
  collected: number;
  total: number;
  percent: number;
};

/** Per-category completion for binder progress chips. */
export function categoryProgressRows(cards: BinderCardEntry[]): CategoryProgress[] {
  const keys = Object.keys(BINDER_CATEGORY_LABELS) as Exclude<BinderCategoryFilter, "all">[];
  return keys.map((category) => {
    const subset = cards.filter((c) => c.category === category);
    const collected = uniqueCollectedCount(subset);
    const total = subset.length;
    return {
      category,
      label: BINDER_CATEGORY_LABELS[category],
      collected,
      total,
      percent: completionPercent(collected, total),
    };
  });
}

/**
 * Top habitat labels from a stop's stored environment_profile
 * (already on catalogue points — no regeneration needed).
 */
export function topHabitatsFromProfile(
  profile: Record<string, number> | null | undefined,
  limit = 2
): { key: string; label: string; score: number }[] {
  if (!profile) return [];
  return Object.entries(profile)
    .filter(([key, score]) => key !== "general" && typeof score === "number" && score >= 0.25)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, score]) => ({
      key,
      label: HABITAT_AFFINITY_LABELS[key] ?? key.replace(/_/g, " "),
      score,
    }));
}

export function describeStopHabitat(profile: Record<string, number> | null | undefined): string | null {
  const tops = topHabitatsFromProfile(profile, 2);
  if (tops.length === 0) return null;
  if (tops.length === 1) return `Near ${tops[0]!.label.toLowerCase()}`;
  return `Near ${tops[0]!.label.toLowerCase()} · ${tops[1]!.label.toLowerCase()}`;
}

export function formatMatchedEnvironments(keys: string[]): string | null {
  const labels = keys
    .filter((k) => k !== "general")
    .map((k) => HABITAT_AFFINITY_LABELS[k] ?? k.replace(/_/g, " "));
  if (labels.length === 0) return null;
  if (labels.length === 1) return `Found near ${labels[0]!.toLowerCase()}`;
  return `Found near ${labels.slice(0, 2).map((l) => l.toLowerCase()).join(" · ")}`;
}
