import { describe, expect, it } from "vitest";
import { estimateChunkCount, splitBboxIntoChunkGrid } from "../national/chunks.js";
import { applyGlobalSpacingGrid } from "../national/spacing.js";
import {
  createBuildManifest,
  newCatalogueBuildId,
  resumeEligibleChunkIds,
} from "../national/manifest.js";

const ukBbox = {
  minLatitude: 49.5,
  minLongitude: -11.2,
  maxLatitude: 61.1,
  maxLongitude: 2.1,
};

describe("national chunks", () => {
  it("assigns stable chunk ids independent of call order", () => {
    const a = splitBboxIntoChunkGrid(ukBbox, 1.0, 400);
    const b = splitBboxIntoChunkGrid(ukBbox, 1.0, 400);
    expect(a.map((c) => c.chunkId)).toEqual(b.map((c) => c.chunkId));
    expect(a[0]?.chunkId).toBe("c_0_0");
    expect(estimateChunkCount(ukBbox, 0.02)).toBeGreaterThan(1000);
  });

  it("pads cores outward", () => {
    const chunks = splitBboxIntoChunkGrid(
      {
        minLatitude: 53,
        minLongitude: -2.2,
        maxLatitude: 53.1,
        maxLongitude: -2.1,
      },
      0.05,
      400
    );
    const c = chunks[0]!;
    expect(c.padded.minLatitude).toBeLessThan(c.core.minLatitude);
    expect(c.padded.maxLatitude).toBeGreaterThan(c.core.maxLatitude);
  });
});

describe("national spacing grid", () => {
  it("keeps higher priority when two points are closer than min spacing", () => {
    const kept = applyGlobalSpacingGrid(
      [
        {
          id: "stop_b",
          latitude: 53.044,
          longitude: -2.165,
          priorityKey: "b",
        },
        {
          id: "stop_a",
          latitude: 53.0441,
          longitude: -2.1651,
          priorityKey: "a",
        },
      ],
      150
    );
    expect(kept).toHaveLength(1);
    expect(kept[0]?.id).toBe("stop_a");
  });

  it("keeps distant points", () => {
    const kept = applyGlobalSpacingGrid(
      [
        {
          id: "stop_a",
          latitude: 53.044,
          longitude: -2.165,
          priorityKey: "a",
        },
        {
          id: "stop_b",
          latitude: 53.05,
          longitude: -2.165,
          priorityKey: "b",
        },
      ],
      150
    );
    expect(kept).toHaveLength(2);
  });

  it("enforces 150 m east-west at high latitude (Scotland)", () => {
    // ~100 m apart in longitude at 58°N — old degree-grid missed these.
    const kept = applyGlobalSpacingGrid(
      [
        {
          id: "stop_b",
          latitude: 58.0,
          longitude: -5.0,
          priorityKey: "b",
        },
        {
          id: "stop_a",
          latitude: 58.0,
          longitude: -5.0 - 100 / (111320 * Math.cos((58 * Math.PI) / 180)),
          priorityKey: "a",
        },
      ],
      150
    );
    expect(kept).toHaveLength(1);
    expect(kept[0]?.id).toBe("stop_a");
  });
});

describe("build manifest", () => {
  it("lists pending chunks for resume", () => {
    const id = newCatalogueBuildId();
    const manifest = createBuildManifest({
      regionId: "uk-and-ireland",
      catalogueBuildId: id,
      sourceRevision: "test",
      sourceSha256: null,
      generationVersion: 2,
      chunkSpanDegrees: 0.02,
      padMetres: 400,
      chunkIds: ["c_0_0", "c_0_1", "c_1_0"],
      generatorConfigHash: "abc",
    });
    manifest.chunks["c_0_0"]!.status = "completed";
    expect(resumeEligibleChunkIds(manifest).sort()).toEqual(["c_0_1", "c_1_0"]);
  });
});
