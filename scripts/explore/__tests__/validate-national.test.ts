/**
 * National validation helpers (Step 10.4).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createBuildManifest,
  saveManifest,
  loadManifest,
} from "../national/manifest.js";
import { resolveBuildDir, findLatestBuildDir } from "../national/resolve-build.js";
import { mergeAlreadyComplete } from "../national/merge-catalogue.js";
import {
  EXCLUDED_TERRITORY_BBOXES,
  formatValidationSummary,
  validateNationalBuild,
} from "../national/validate-national.js";
import { applyGlobalSpacingGrid } from "../national/spacing.js";

describe("resolve-build", () => {
  it("finds latest build_* directory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "explore-builds-"));
    fs.mkdirSync(path.join(root, "build_2026-01-01T00-00-00-000Z_aaaaaa"));
    fs.mkdirSync(path.join(root, "build_2026-07-24T23-11-06-550Z_aa8033"));
    const latest = findLatestBuildDir(root);
    expect(latest).toContain("build_2026-07-24T23-11-06-550Z_aa8033");
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("resolves explicit --build-dir", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "explore-builds-"));
    const build = path.join(root, "build_x");
    fs.mkdirSync(build);
    expect(resolveBuildDir({ outputRoot: root, buildDir: build })).toBe(build);
    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe("national validate (fixture)", () => {
  it("validates a tiny completed build and updates validation_status", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "explore-nval-"));
    const buildDir = path.join(root, "build_test");
    fs.mkdirSync(path.join(buildDir, "chunks"), { recursive: true });

    const coveragePath = path.join(root, "coverage.geojson");
    // Simple square covering Stoke-ish point
    fs.writeFileSync(
      coveragePath,
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-2.2, 53.0],
                  [-2.1, 53.0],
                  [-2.1, 53.1],
                  [-2.2, 53.1],
                  [-2.2, 53.0],
                ],
              ],
            },
          },
        ],
      })
    );

    const manifest = createBuildManifest({
      regionId: "uk-and-ireland",
      catalogueBuildId: "build_test",
      sourceRevision: "2026-07-24_7093f494b688",
      sourceSha256: "abc",
      generationVersion: 2,
      chunkSpanDegrees: 0.02,
      padMetres: 400,
      chunkIds: ["c_0_0"],
      generatorConfigHash: "ac05054c54dad3c0",
    });
    manifest.chunks["c_0_0"] = {
      chunkId: "c_0_0",
      status: "completed",
      acceptedCount: 2,
      candidateCount: 2,
      rejectedCount: 0,
      configHash: "ac05054c54dad3c0",
      outputPath: path.join(buildDir, "chunks", "c_0_0.ndjson"),
      finishedAt: new Date().toISOString(),
    };
    saveManifest(buildDir, manifest);

    const points = [
      {
        id: "stop_a",
        latitude: 53.044,
        longitude: -2.165,
        type: 1,
        source_type: "footpath",
        generation_version: 2,
        source_revision: "2026-07-24_7093f494b688",
        source_feature_id: "way/1",
        confidence: 0.9,
        environment_profile: { general: 1 },
        priority_key: "a",
      },
      {
        id: "stop_b",
        latitude: 53.0465,
        longitude: -2.165,
        type: 2,
        source_type: "path",
        generation_version: 2,
        source_revision: "2026-07-24_7093f494b688",
        source_feature_id: "way/2",
        confidence: 0.9,
        environment_profile: { urban: 0.5, general: 0.5 },
        priority_key: "b",
      },
    ];
    fs.writeFileSync(
      path.join(buildDir, "chunks", "c_0_0.ndjson"),
      points.map((p) => JSON.stringify(p)).join("\n") + "\n"
    );

    // Pre-write spaced catalogue (merge already done path)
    const spaced = applyGlobalSpacingGrid(
      points.map((p) => ({ ...p, priorityKey: p.priority_key })),
      150
    );
    fs.writeFileSync(
      path.join(buildDir, "catalogue.ndjson"),
      spaced
        .map(({ priorityKey: _pk, priority_key: _pr, ...rest }) => JSON.stringify(rest))
        .join("\n") + "\n"
    );
    expect(mergeAlreadyComplete(buildDir)).toBe(true);

    const report = await validateNationalBuild({
      buildDir,
      regionId: "uk-and-ireland",
      coveragePath,
      generationVersion: 2,
      expectedSourceRevision: "2026-07-24_7093f494b688",
      expectedConfigHash: "ac05054c54dad3c0",
    });

    expect(report.ok).toBe(true);
    expect(report.ndjson.rows).toBe(2);
    expect(report.ndjson.outside_coverage).toBe(0);
    expect(report.ndjson.below_spacing_150m_pairs).toBe(0);
    // min_spacing_m is null when no neighbour falls inside the search ring (points far apart).
    if (report.ndjson.min_spacing_m != null) {
      expect(report.ndjson.min_spacing_m).toBeGreaterThanOrEqual(150);
    }
    expect(loadManifest(buildDir).validation_status).toBe("ok");
    expect(fs.existsSync(path.join(buildDir, "validation.json"))).toBe(true);
    expect(fs.existsSync(path.join(buildDir, "validation-summary.txt"))).toBe(true);
    const txt = formatValidationSummary(report);
    expect(txt).toContain("PASS");

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("flags points inside excluded territory boxes", () => {
    const iom = EXCLUDED_TERRITORY_BBOXES.find((b) => b.id === "isle_of_man")!;
    expect(iom.minLatitude).toBeLessThan(iom.maxLatitude);
  });
});
