import { randomBytes } from "node:crypto";

/**
 * Explore card weighting (Step 8).
 * final_weight = base_weight × environment_multiplier × collection_multiplier
 * Rarity is encoded only in base_weight (not applied again).
 */
export const EXPLORE_HABITAT_KEYS = [
  "freshwater",
  "wetland",
  "woodland",
  "grassland",
  "farmland",
  "urban",
  "park_garden",
  "coastal",
  "general",
] as const;

export type ExploreHabitatKey = (typeof EXPLORE_HABITAT_KEYS)[number];

export type ExploreCardCategory = "animal" | "habitat" | "flora_wildlife";
export type ExploreCardRarity = "common" | "uncommon" | "rare" | "very_rare";

export const DEFAULT_NEW_CARD_MULTIPLIER = 4;
export const DEFAULT_OWNED_CARD_MULTIPLIER = 1;
export const DEFAULT_MIN_ENVIRONMENT_MULTIPLIER = 0.1;

export type WeightableCard = {
  id: string;
  baseWeight: number;
  habitatWeights: Record<string, number>;
  owned: boolean;
};

export type WeightBreakdown = {
  cardId: string;
  baseWeight: number;
  environmentMultiplier: number;
  collectionMultiplier: number;
  finalWeight: number;
  matchedEnvironments: string[];
};

export type WeightConfig = {
  newCardMultiplier: number;
  ownedCardMultiplier: number;
  minEnvironmentMultiplier: number;
};

export const DEFAULT_WEIGHT_CONFIG: WeightConfig = {
  newCardMultiplier: DEFAULT_NEW_CARD_MULTIPLIER,
  ownedCardMultiplier: DEFAULT_OWNED_CARD_MULTIPLIER,
  minEnvironmentMultiplier: DEFAULT_MIN_ENVIRONMENT_MULTIPLIER,
};

export function sanitizeHabitatWeights(
  raw: unknown
): { ok: true; value: Record<string, number> } | { ok: false; error: string } {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "habitat_weights_must_be_object" };
  }
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return { ok: false, error: "habitat_weight_must_be_non_negative_number" };
    }
    out[key] = value;
  }
  return { ok: true, value: out };
}

/**
 * environment_multiplier = max(min, sum(stop_score[k] × card_habitat[k]))
 */
export function environmentMultiplier(
  stopEnvironment: Record<string, number>,
  cardHabitatWeights: Record<string, number>,
  minMultiplier = DEFAULT_MIN_ENVIRONMENT_MULTIPLIER
): { multiplier: number; matchedEnvironments: string[] } {
  let sum = 0;
  const matched: string[] = [];
  for (const [key, cardW] of Object.entries(cardHabitatWeights)) {
    if (!(typeof cardW === "number") || cardW <= 0) continue;
    const stopScore = stopEnvironment[key];
    if (typeof stopScore !== "number" || !(stopScore > 0)) continue;
    sum += stopScore * cardW;
    matched.push(key);
  }
  // General fallback: if card has general weight and sum is still low, still apply general×score
  // (already included in loop). Enforce minimum so cards stay possible unless weight is zero.
  return {
    multiplier: Math.max(minMultiplier, sum),
    matchedEnvironments: matched.sort(),
  };
}

export function collectionMultiplier(
  owned: boolean,
  config: WeightConfig = DEFAULT_WEIGHT_CONFIG
): number {
  return owned ? config.ownedCardMultiplier : config.newCardMultiplier;
}

export function computeCardWeight(
  card: WeightableCard,
  stopEnvironment: Record<string, number>,
  config: WeightConfig = DEFAULT_WEIGHT_CONFIG
): WeightBreakdown | { error: string } {
  if (!(typeof card.baseWeight === "number") || !Number.isFinite(card.baseWeight)) {
    return { error: "invalid_base_weight" };
  }
  if (card.baseWeight < 0) {
    return { error: "negative_base_weight" };
  }
  const habitat = sanitizeHabitatWeights(card.habitatWeights);
  if (!habitat.ok) return { error: habitat.error };

  const env = environmentMultiplier(
    stopEnvironment,
    habitat.value,
    config.minEnvironmentMultiplier
  );
  const col = collectionMultiplier(card.owned, config);
  const finalWeight = card.baseWeight * env.multiplier * col;
  if (!Number.isFinite(finalWeight) || finalWeight < 0) {
    return { error: "invalid_final_weight" };
  }
  return {
    cardId: card.id,
    baseWeight: card.baseWeight,
    environmentMultiplier: env.multiplier,
    collectionMultiplier: col,
    finalWeight,
    matchedEnvironments: env.matchedEnvironments,
  };
}

export function buildWeightedPool(
  cards: WeightableCard[],
  stopEnvironment: Record<string, number>,
  config: WeightConfig = DEFAULT_WEIGHT_CONFIG
):
  | { ok: true; entries: WeightBreakdown[]; totalWeight: number }
  | { ok: false; error: string } {
  const entries: WeightBreakdown[] = [];
  for (const card of cards) {
    const result = computeCardWeight(card, stopEnvironment, config);
    if ("error" in result) {
      if (result.error === "negative_base_weight" || result.error === "invalid_base_weight") {
        return { ok: false, error: result.error };
      }
      continue;
    }
    if (result.finalWeight > 0) {
      entries.push(result);
    }
  }
  const totalWeight = entries.reduce((s, e) => s + e.finalWeight, 0);
  if (!(totalWeight > 0) || entries.length === 0) {
    return { ok: false, error: "no_positive_weight_pool" };
  }
  return { ok: true, entries, totalWeight };
}

/**
 * Cumulative weighted selection.
 * random01 must be in [0, 1). Inject for tests; production uses crypto.
 */
export function selectWeightedCard(
  pool: WeightBreakdown[],
  totalWeight: number,
  random01: number
): WeightBreakdown | null {
  if (!(totalWeight > 0) || pool.length === 0) return null;
  if (!(random01 >= 0) || random01 >= 1 || !Number.isFinite(random01)) {
    return null;
  }
  const target = random01 * totalWeight;
  let cumulative = 0;
  for (const entry of pool) {
    cumulative += entry.finalWeight;
    if (target < cumulative) return entry;
  }
  return pool[pool.length - 1] ?? null;
}

export function secureRandom01(): number {
  // Node crypto — not a client seed.
  const buf = randomBytes(6);
  const n = buf.readUIntBE(0, 6);
  return n / 0x1_0000_0000_0000;
}
