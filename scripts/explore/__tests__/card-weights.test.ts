import { describe, expect, it } from "vitest";
import {
  buildWeightedPool,
  computeCardWeight,
  DEFAULT_WEIGHT_CONFIG,
  environmentMultiplier,
  selectWeightedCard,
  type WeightableCard,
} from "../card-weights.js";

const freshwaterStop = { freshwater: 0.9, park_garden: 0.2, general: 0.1 };
const woodlandStop = { woodland: 0.85, general: 0.1 };
const urbanStop = { urban: 0.8, park_garden: 0.3, general: 0.1 };

function card(
  partial: Partial<WeightableCard> & Pick<WeightableCard, "id" | "baseWeight" | "habitatWeights">
): WeightableCard {
  return { owned: false, ...partial };
}

describe("card weight calculation", () => {
  it("gives unowned cards the configured new-card multiplier", () => {
    const result = computeCardWeight(
      card({
        id: "a",
        baseWeight: 10,
        habitatWeights: { general: 1 },
        owned: false,
      }),
      { general: 1 }
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.collectionMultiplier).toBe(DEFAULT_WEIGHT_CONFIG.newCardMultiplier);
      expect(result.finalWeight).toBe(
        10 * result.environmentMultiplier * DEFAULT_WEIGHT_CONFIG.newCardMultiplier
      );
    }
  });

  it("keeps owned cards possible with a lower multiplier", () => {
    const result = computeCardWeight(
      card({
        id: "a",
        baseWeight: 10,
        habitatWeights: { general: 1 },
        owned: true,
      }),
      { general: 1 }
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.collectionMultiplier).toBe(DEFAULT_WEIGHT_CONFIG.ownedCardMultiplier);
      expect(result.finalWeight).toBeGreaterThan(0);
    }
  });

  it("increases weight for a strong habitat match", () => {
    const matched = computeCardWeight(
      card({
        id: "frog",
        baseWeight: 5,
        habitatWeights: { freshwater: 5, general: 0.25 },
        owned: false,
      }),
      freshwaterStop
    );
    const unmatched = computeCardWeight(
      card({
        id: "fox",
        baseWeight: 5,
        habitatWeights: { woodland: 5, general: 0.25 },
        owned: false,
      }),
      freshwaterStop
    );
    expect("error" in matched).toBe(false);
    expect("error" in unmatched).toBe(false);
    if (!("error" in matched) && !("error" in unmatched)) {
      expect(matched.finalWeight).toBeGreaterThan(unmatched.finalWeight);
      expect(matched.matchedEnvironments).toContain("freshwater");
    }
  });

  it("keeps general cards possible", () => {
    const result = computeCardWeight(
      card({
        id: "badge",
        baseWeight: 10,
        habitatWeights: { general: 5 },
        owned: false,
      }),
      { urban: 0.5 }
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.finalWeight).toBeGreaterThan(0);
      expect(result.environmentMultiplier).toBeGreaterThanOrEqual(
        DEFAULT_WEIGHT_CONFIG.minEnvironmentMultiplier
      );
    }
  });

  it("keeps rare cards possible without double-applying rarity", () => {
    const rare = computeCardWeight(
      card({
        id: "owl",
        baseWeight: 2,
        habitatWeights: { woodland: 5 },
        owned: false,
      }),
      woodlandStop
    );
    const common = computeCardWeight(
      card({
        id: "oak",
        baseWeight: 10,
        habitatWeights: { woodland: 5 },
        owned: false,
      }),
      woodlandStop
    );
    expect("error" in rare).toBe(false);
    expect("error" in common).toBe(false);
    if (!("error" in rare) && !("error" in common)) {
      // Same habitat score → ratio equals base_weight ratio (no extra rarity factor).
      expect(common.finalWeight / rare.finalWeight).toBeCloseTo(10 / 2, 5);
    }
  });

  it("rejects negative base weights", () => {
    const result = computeCardWeight(
      card({ id: "bad", baseWeight: -1, habitatWeights: { general: 1 } }),
      { general: 1 }
    );
    expect(result).toEqual({ error: "negative_base_weight" });
  });

  it("ignores zero-weight cards in the pool", () => {
    const pool = buildWeightedPool(
      [
        card({ id: "zero", baseWeight: 0.0000001, habitatWeights: { general: 0 }, owned: false }),
        card({ id: "ok", baseWeight: 10, habitatWeights: { general: 1 }, owned: false }),
      ],
      { general: 1 },
      { ...DEFAULT_WEIGHT_CONFIG, minEnvironmentMultiplier: 0 }
    );
    // base 0.0000001 * 0 env * 4 may be 0 — ensure ok card remains
    expect(pool.ok).toBe(true);
    if (pool.ok) {
      expect(pool.entries.some((e) => e.cardId === "ok")).toBe(true);
    }
  });

  it("supports fractional weights", () => {
    const result = computeCardWeight(
      card({
        id: "frac",
        baseWeight: 2.5,
        habitatWeights: { urban: 0.5 },
        owned: false,
      }),
      urbanStop
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.finalWeight).toBeGreaterThan(0);
      expect(Number.isFinite(result.finalWeight)).toBe(true);
    }
  });

  it("fails safely when no card has positive weight", () => {
    const pool = buildWeightedPool(
      [card({ id: "z", baseWeight: 10, habitatWeights: { general: 0 }, owned: false })],
      { woodland: 1 },
      { ...DEFAULT_WEIGHT_CONFIG, minEnvironmentMultiplier: 0 }
    );
    expect(pool.ok).toBe(false);
    if (!pool.ok) expect(pool.error).toBe("no_positive_weight_pool");
  });

  it("selects by cumulative weights with injectable random", () => {
    const pool = [
      {
        cardId: "a",
        baseWeight: 1,
        environmentMultiplier: 1,
        collectionMultiplier: 1,
        finalWeight: 1,
        matchedEnvironments: [],
      },
      {
        cardId: "b",
        baseWeight: 1,
        environmentMultiplier: 1,
        collectionMultiplier: 1,
        finalWeight: 3,
        matchedEnvironments: [],
      },
    ];
    expect(selectWeightedCard(pool, 4, 0)?.cardId).toBe("a");
    expect(selectWeightedCard(pool, 4, 0.3)?.cardId).toBe("b");
  });

  it("environmentMultiplier uses min floor", () => {
    const { multiplier } = environmentMultiplier({}, { freshwater: 5 }, 0.1);
    expect(multiplier).toBe(0.1);
  });

  it("freshwater stop favours freshwater cards in calculated weights", () => {
    const frog = computeCardWeight(
      card({
        id: "frog",
        baseWeight: 5,
        habitatWeights: { freshwater: 5, general: 0.25 },
      }),
      freshwaterStop
    );
    const sparrow = computeCardWeight(
      card({
        id: "sparrow",
        baseWeight: 10,
        habitatWeights: { urban: 5, general: 0.3 },
      }),
      freshwaterStop
    );
    if (!("error" in frog) && !("error" in sparrow)) {
      expect(frog.finalWeight).toBeGreaterThan(sparrow.finalWeight);
    }
  });
});
