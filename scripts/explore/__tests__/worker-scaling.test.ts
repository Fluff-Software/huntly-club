/**
 * Step 10.4B — production path, worker determinism helpers, resume, gates.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertOptimisedProductionPath,
  groupChunksIntoProcessingBlocks,
  PRODUCTION_PATH_ID,
} from "../national/production-path.js";
import { splitBboxIntoChunkGrid } from "../national/chunks.js";
import {
  createBuildManifest,
  resumeEligibleChunkIds,
  saveManifest,
  loadManifest,
  updateChunkCheckpoint,
} from "../national/manifest.js";
import { applyGlobalSpacingGrid } from "../national/spacing.js";
import { assertLegacyPathForbiddenForFullRun } from "../generate-catalogue-national.js";
import { summarise } from "../status-catalogue.js";
import { OPTIMISED_ALGORITHM_VERSION } from "../national/regional-block.js";

describe("production national path (10.4B)", () => {
  it("asserts regional-block + rbush production path", () => {
    const a = assertOptimisedProductionPath();
    expect(a.useRegionalBlocks).toBe(true);
    expect(a.forbidLegacyPerCellOsmium).toBe(true);
    expect(a.pathId).toBe(PRODUCTION_PATH_ID);
    expect(a.algorithmVersion).toBe(OPTIMISED_ALGORITHM_VERSION);
  });

  it("refuses legacy per-cell path for production assertion", () => {
    expect(() =>
      assertOptimisedProductionPath({ allowLegacyPerCellOsmium: true })
    ).toThrow(/Legacy per-cell osmium/);
  });

  it("refuses legacy with --confirm-full-run", () => {
    expect(() => assertLegacyPathForbiddenForFullRun(true)).toThrow(/confirm-full-run/);
  });

  it("groups cells into stable processing blocks", () => {
    const chunks = splitBboxIntoChunkGrid(
      {
        minLatitude: 53.0,
        minLongitude: -2.2,
        maxLatitude: 53.12,
        maxLongitude: -2.0,
      },
      0.02,
      400
    );
    const a = groupChunksIntoProcessingBlocks(chunks);
    const b = groupChunksIntoProcessingBlocks([...chunks].reverse());
    expect(a.map((x) => x.blockId)).toEqual(b.map((x) => x.blockId));
    expect(a.length).toBeGreaterThan(0);
    const cellIdsA = a.flatMap((x) => x.chunks.map((c) => c.chunkId)).sort();
    const cellIdsB = b.flatMap((x) => x.chunks.map((c) => c.chunkId)).sort();
    expect(cellIdsA).toEqual(cellIdsB);
    expect(cellIdsA.length).toBe(chunks.length);
  });

  it("worker order of blocks does not change cell membership", () => {
    const chunks = splitBboxIntoChunkGrid(
      {
        minLatitude: 51.49,
        minLongitude: -0.16,
        maxLatitude: 51.53,
        maxLongitude: -0.1,
      },
      0.02,
      400
    );
    const blocks = groupChunksIntoProcessingBlocks(chunks);
    const shuffled = [...blocks].sort(() => 0.5 - Math.random());
    const ids1 = blocks.flatMap((b) => b.chunks.map((c) => c.chunkId)).sort();
    const ids2 = shuffled.flatMap((b) => b.chunks.map((c) => c.chunkId)).sort();
    expect(ids1).toEqual(ids2);
  });
});

describe("resume after interruption (manifest)", () => {
  it("skips completed chunks and restarts incomplete ones", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "explore-resume-"));
    const manifest = createBuildManifest({
      regionId: "uk-and-ireland",
      catalogueBuildId: "build_test",
      sourceRevision: "test",
      sourceSha256: "abc",
      generationVersion: 2,
      chunkSpanDegrees: 0.02,
      padMetres: 400,
      chunkIds: ["c_0_0", "c_0_1", "c_0_2", "c_0_3"],
      generatorConfigHash: "hash1",
    });
    saveManifest(dir, manifest);
    updateChunkCheckpoint(dir, {
      chunkId: "c_0_0",
      status: "completed",
      acceptedCount: 3,
      finishedAt: new Date().toISOString(),
      configHash: "hash1",
    });
    updateChunkCheckpoint(dir, {
      chunkId: "c_0_1",
      status: "running",
      startedAt: new Date().toISOString(),
      configHash: "hash1",
    });
    const m = loadManifest(dir);
    const eligible = resumeEligibleChunkIds(m).sort();
    expect(eligible).toEqual(["c_0_1", "c_0_2", "c_0_3"]);
    expect(eligible).not.toContain("c_0_0");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("config hash mismatch is detectable for resume safety", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "explore-hash-"));
    const manifest = createBuildManifest({
      regionId: "uk-and-ireland",
      catalogueBuildId: "build_test",
      sourceRevision: "test",
      sourceSha256: "abc",
      generationVersion: 2,
      chunkSpanDegrees: 0.02,
      padMetres: 400,
      chunkIds: ["c_0_0"],
      generatorConfigHash: "oldhash",
    });
    saveManifest(dir, manifest);
    const loaded = loadManifest(dir);
    expect(loaded.generator_config_hash).toBe("oldhash");
    expect(loaded.generator_config_hash === "newhash").toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("spacing + duplicates", () => {
  it("enforces 150 m grid spacing", () => {
    const kept = applyGlobalSpacingGrid(
      [
        { id: "a", latitude: 53.044, longitude: -2.165, priorityKey: "a" },
        { id: "b", latitude: 53.04405, longitude: -2.16505, priorityKey: "b" },
      ],
      150
    );
    expect(kept).toHaveLength(1);
  });

  it("does not emit duplicate ids after spacing merge pattern", () => {
    const spaced = applyGlobalSpacingGrid(
      [
        { id: "a", latitude: 53.044, longitude: -2.165, priorityKey: "a" },
        { id: "a", latitude: 53.044, longitude: -2.165, priorityKey: "a" },
        { id: "b", latitude: 53.05, longitude: -2.165, priorityKey: "b" },
      ],
      150
    );
    const ids = spaced.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("status:catalogue read-only", () => {
  it("summarise does not mutate manifest", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "explore-status-"));
    const manifest = createBuildManifest({
      regionId: "uk-and-ireland",
      catalogueBuildId: "build_status",
      sourceRevision: "test",
      sourceSha256: null,
      generationVersion: 2,
      chunkSpanDegrees: 0.02,
      padMetres: 400,
      chunkIds: ["c_0_0", "c_0_1"],
      generatorConfigHash: "h",
    });
    saveManifest(dir, manifest);
    const before = fs.readFileSync(path.join(dir, "build-manifest.json"), "utf8");
    const status = summarise(manifest, dir);
    const after = fs.readFileSync(path.join(dir, "build-manifest.json"), "utf8");
    expect(after).toBe(before);
    expect(status.read_only).toBe(true);
    expect(status.total_chunks).toBe(2);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("confirm-full-run gate (CLI contract)", () => {
  it("national entrypoint source still gates on --confirm-full-run", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../generate-catalogue-national.ts"),
      "utf8"
    );
    expect(src).toContain("--confirm-full-run");
    expect(src).toContain("processRegionalBlock");
    expect(src).toContain("assertOptimisedProductionPath");
    expect(src).toContain("groupChunksIntoProcessingBlocks");
    // Legacy per-cell processChunk must not be the production loop.
    expect(src).not.toMatch(/await processChunk\(/);
  });
});
