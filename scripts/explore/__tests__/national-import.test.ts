/**
 * Step 10.5 — national bulk import helpers (no live DB required).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  NATIONAL_EXPECTED_POINT_COUNT,
  NATIONAL_NDJSON_SHA256,
  NATIONAL_POINTS_BY_TYPE,
  NATIONAL_CONFIG_HASH,
  NATIONAL_SOURCE_REVISION,
} from "../national/import/constants.js";
import {
  copyCsvField,
  parseNationalPointLine,
  pointToCopyCsvLine,
  streamScanNationalNdjson,
} from "../national/import/stream-ndjson.js";
import { runNationalImportPreflight } from "../national/import/preflight.js";
import { runNationalImportDryRun } from "../national/import/dry-run.js";
import {
  assertActivationConfirmed,
  parseActivateArgs,
} from "../activate-catalogue-national.js";

const BUILD =
  "/Users/albanhampton/dev/huntly-club/scripts/explore/output/catalogues/uk-and-ireland/build_2026-07-24T23-11-06-550Z_aa8033";
const NDJSON = path.join(BUILD, "catalogue.ndjson");
const hasBuild = fs.existsSync(NDJSON);

describe("national import constants", () => {
  it("locks authoritative expected count and sha", () => {
    expect(NATIONAL_EXPECTED_POINT_COUNT).toBe(776_751);
    expect(NATIONAL_NDJSON_SHA256).toHaveLength(64);
    const sum = Object.values(NATIONAL_POINTS_BY_TYPE).reduce((a, b) => a + b, 0);
    expect(sum).toBe(NATIONAL_EXPECTED_POINT_COUNT);
  });
});

describe("COPY transform", () => {
  it("preserves id, coords, type, source_type, environment_profile", () => {
    const line = JSON.stringify({
      id: "stop_abc",
      latitude: 53.044,
      longitude: -2.165,
      type: 1,
      source_type: "footpath",
      generation_version: 2,
      source_revision: NATIONAL_SOURCE_REVISION,
      source_feature_id: "way/1",
      confidence: 0.9,
      environment_profile: { general: 1, urban: 0.2 },
    });
    const p = parseNationalPointLine(line);
    expect(p.id).toBe("stop_abc");
    expect(p.latitude).toBe(53.044);
    expect(p.longitude).toBe(-2.165);
    expect(p.type).toBe(1);
    expect(p.source_type).toBe("footpath");
    expect(p.environment_profile.urban).toBe(0.2);
    const csv = pointToCopyCsvLine("00000000-0000-0000-0000-000000000001", p);
    expect(csv).toContain("stop_abc");
    expect(csv).toContain("53.044");
    expect(csv).toContain("footpath");
    expect(csv).toContain("urban");
    expect(csv).toContain("0.2");
  });

  it("escapes CSV quotes", () => {
    expect(copyCsvField('a"b')).toBe('"a""b"');
  });

  it("rejects invalid environment / coords", () => {
    expect(() =>
      parseNationalPointLine(
        JSON.stringify({
          id: "x",
          latitude: 53,
          longitude: -2,
          type: 1,
          source_type: "footpath",
          generation_version: 2,
          source_revision: "r",
          environment_profile: { nope: 1 },
        })
      )
    ).toThrow(/invalid_environment/);
  });
});

describe("activation gate", () => {
  it("refuses without --confirm-activate", () => {
    expect(() => assertActivationConfirmed(false)).toThrow(/confirm-activate/);
    const args = parseActivateArgs(["--region", "uk-and-ireland"]);
    expect(args.confirmActivate).toBe(false);
  });

  it("parses confirm flag", () => {
    const args = parseActivateArgs(["--confirm-activate"]);
    expect(args.confirmActivate).toBe(true);
    expect(() => assertActivationConfirmed(true)).not.toThrow();
  });
});

describe("preflight rejects bad validation", () => {
  it("fails when validation.json is not ok", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "explore-pre-"));
    fs.writeFileSync(path.join(dir, "catalogue.ndjson"), "{}\n");
    fs.writeFileSync(
      path.join(dir, "validation.json"),
      JSON.stringify({ ok: false, errors: ["x"] })
    );
    const r = await runNationalImportPreflight({
      buildDir: dir,
      skipStreamScan: true,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("validation_status_not_ok"))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("fails on wrong source revision in validation metadata", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "explore-pre-"));
    fs.writeFileSync(path.join(dir, "catalogue.ndjson"), "{}\n");
    fs.writeFileSync(
      path.join(dir, "validation.json"),
      JSON.stringify({
        ok: true,
        expected_source_revision: "wrong",
        expected_config_hash: NATIONAL_CONFIG_HASH,
        ndjson: { rows: NATIONAL_EXPECTED_POINT_COUNT },
      })
    );
    const r = await runNationalImportPreflight({
      buildDir: dir,
      skipStreamScan: true,
      expectedSourceRevision: NATIONAL_SOURCE_REVISION,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("source_revision"))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("fails on wrong config hash", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "explore-pre-"));
    fs.writeFileSync(path.join(dir, "catalogue.ndjson"), "{}\n");
    fs.writeFileSync(
      path.join(dir, "validation.json"),
      JSON.stringify({
        ok: true,
        expected_source_revision: NATIONAL_SOURCE_REVISION,
        expected_config_hash: "deadbeefdeadbeef",
        ndjson: { rows: NATIONAL_EXPECTED_POINT_COUNT },
      })
    );
    const r = await runNationalImportPreflight({
      buildDir: dir,
      skipStreamScan: true,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("config_hash"))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe.runIf(hasBuild)("validated national build (live files)", () => {
  it("preflight accepts the validated build (stream scan)", async () => {
    const r = await runNationalImportPreflight({
      buildDir: BUILD,
      skipStreamScan: false,
    });
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.scannedRows).toBe(NATIONAL_EXPECTED_POINT_COUNT);
    expect(r.sha256).toBe(NATIONAL_NDJSON_SHA256);
  }, 180_000);

  it("dry-run counts exactly 776751 and type totals match", async () => {
    const r = await runNationalImportDryRun({ ndjsonPath: NDJSON });
    expect(r.ok).toBe(true);
    expect(r.stats.rows).toBe(776_751);
    expect(r.stats.pointsByType).toEqual(NATIONAL_POINTS_BY_TYPE);
    expect(r.inserts).toBe(false);
    expect(r.activation).toBe(false);
    expect(r.stagingRowsLeft).toBe(0);
  }, 180_000);

  it("streams without loading full catalogue as an array", async () => {
    // streamScanNationalNdjson only keeps an ID set + counters — not row objects.
    const before = process.memoryUsage().heapUsed;
    await streamScanNationalNdjson(NDJSON, { trackIds: true });
    const after = process.memoryUsage().heapUsed;
    // Soft bound: must stay well under loading ~200MB of row objects as JS heap growth.
    expect(after - before).toBeLessThan(400 * 1024 * 1024);
  }, 180_000);
});
