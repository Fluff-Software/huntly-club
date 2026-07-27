import { describe, expect, it } from "vitest";
import { buildStopId, fnv1a32, stableHashMod } from "../stable-hash.js";

describe("stable-hash", () => {
  it("is deterministic", () => {
    expect(fnv1a32("abc")).toBe(fnv1a32("abc"));
    expect(stableHashMod("v1|way/1", 150)).toBe(stableHashMod("v1|way/1", 150));
  });

  it("builds stable stop ids including rounded coordinates", () => {
    const a = buildStopId({
      generationVersion: 1,
      sourceType: "park",
      sourceFeatureId: "fixture/park",
      candidateIndex: 0,
      latitude: 51.455123456,
      longitude: -0.29,
      coordinateDecimals: 6,
    });
    const b = buildStopId({
      generationVersion: 1,
      sourceType: "park",
      sourceFeatureId: "fixture/park",
      candidateIndex: 0,
      latitude: 51.455123,
      longitude: -0.29,
      coordinateDecimals: 6,
    });
    expect(a).toBe(b);
    expect(a).toMatch(/^stop_[0-9a-f]{8}$/);
  });
});
