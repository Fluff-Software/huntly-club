/**
 * Streaming national catalogue validation (Step 10.4).
 * Does not load the full catalogue into memory as row objects.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createReadStream } from "node:fs";
import { sourceTypeFromPointType } from "../point-types.js";
import { haversineMeters } from "../safety-rules.js";
import type { EnvironmentKey } from "../types.js";
import {
  loadCoveragePolygons,
  pointInCoverageIndex,
  prepareCoverageIndex,
} from "./coverage.js";
import { loadManifest, saveManifest, type BuildManifest } from "./manifest.js";
import {
  catalogueNdjsonPath,
  catalogueSummaryPath,
  mergeAlreadyComplete,
  mergeNationalCatalogue,
} from "./merge-catalogue.js";

const ENV_KEYS = new Set<string>([
  "freshwater",
  "wetland",
  "woodland",
  "grassland",
  "farmland",
  "urban",
  "park_garden",
  "general",
] satisfies EnvironmentKey[]);

/** Approximate admin boxes for territories that must remain empty. */
export const EXCLUDED_TERRITORY_BBOXES = [
  {
    id: "isle_of_man",
    minLatitude: 54.0,
    maxLatitude: 54.45,
    minLongitude: -4.85,
    maxLongitude: -4.3,
  },
  {
    id: "jersey",
    minLatitude: 49.15,
    maxLatitude: 49.28,
    minLongitude: -2.3,
    maxLongitude: -2.0,
  },
  {
    id: "guernsey",
    minLatitude: 49.4,
    maxLatitude: 49.52,
    minLongitude: -2.7,
    maxLongitude: -2.45,
  },
] as const;

export type NationalValidationReport = {
  ok: boolean;
  region_id: string;
  build_dir: string;
  catalogue_build_id: string;
  validated_at: string;
  expected_source_revision: string;
  expected_config_hash: string;
  merge: {
    already_complete: boolean;
    ran_merge: boolean;
    skipped_reason?: string;
  };
  count_semantics: {
    chunk_accepted_sum: number;
    note_chunk_accepted:
      "Sum of per-chunk acceptedCount — pre coverage-filter and pre global spacing";
    manifest_aggregates_accepted: number | null;
    note_aggregates:
      "Set at merge time — intended post coverage + spacing count (may include id-dedupe skew)";
    final_ndjson_rows: number;
    note_final: "Authoritative final catalogue = unique rows in catalogue.ndjson";
  };
  checkpoints: {
    total_chunks: number;
    completed: number;
    failed: number;
    pending_or_running: number;
    config_hash_mismatches: number;
    missing_chunk_files: number;
    all_completed: boolean;
    zero_failed: boolean;
    hashes_match_expected: boolean;
  };
  ndjson: {
    path: string;
    bytes: number;
    rows: number;
    malformed_rows: number;
    duplicate_ids: number;
    invalid_coords: number;
    invalid_types: number;
    invalid_source_type: number;
    invalid_environment_profiles: number;
    outside_coverage: number;
    excluded_territory_hits: Record<string, number>;
    source_revision_mismatches: number;
    generation_version_mismatches: number;
    points_by_type: Record<string, number>;
    min_spacing_m: number | null;
    below_spacing_150m_pairs: number;
  };
  errors: string[];
  warnings: string[];
  outputs: {
    validation_json: string;
    validation_summary_txt: string;
    catalogue_ndjson: string;
    catalogue_summary_json: string;
  };
};

type CompactPoint = { latitude: number; longitude: number };

const METRES_PER_DEG_LAT = 111_320;
const LON_REF_LATITUDE = 61;

function spacingLatIndex(lat: number, cellMetres: number): number {
  return Math.floor((lat * METRES_PER_DEG_LAT) / cellMetres);
}

function spacingLonIndex(lon: number, cellMetres: number): number {
  const metresPerDegLon =
    METRES_PER_DEG_LAT * Math.max(0.2, Math.cos((LON_REF_LATITUDE * Math.PI) / 180));
  return Math.floor((lon * metresPerDegLon) / cellMetres);
}

/**
 * Streaming min-spacing check using the same metre-aware grid as generation.
 * Stores only lat/lon per cell — not full catalogue rows.
 */
function checkSpacingAgainstGrid(
  point: CompactPoint,
  grid: Map<string, CompactPoint[]>,
  cellMetres: number,
  minMetres: number
): { violation: boolean; nearest: number } {
  const iy = spacingLatIndex(point.latitude, cellMetres);
  const ix = spacingLonIndex(point.longitude, cellMetres);
  let nearest = Infinity;
  let violation = false;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const bucket = grid.get(`${iy + dy}:${ix + dx}`);
      if (!bucket) continue;
      for (const other of bucket) {
        const d = haversineMeters(point, other);
        if (d < nearest) nearest = d;
        if (d < minMetres) violation = true;
      }
    }
  }
  const key = `${iy}:${ix}`;
  const bucket = grid.get(key);
  if (bucket) bucket.push(point);
  else grid.set(key, [point]);
  return { violation, nearest };
}

function inExcludedBox(
  lat: number,
  lon: number,
  box: (typeof EXCLUDED_TERRITORY_BBOXES)[number]
): boolean {
  return (
    lat >= box.minLatitude &&
    lat <= box.maxLatitude &&
    lon >= box.minLongitude &&
    lon <= box.maxLongitude
  );
}

function isValidEnvironmentProfile(v: unknown): boolean {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return false;
  const obj = v as Record<string, unknown>;
  for (const [k, val] of Object.entries(obj)) {
    if (!ENV_KEYS.has(k)) return false;
    if (typeof val !== "number" || !Number.isFinite(val) || val < 0) return false;
  }
  return true;
}

export async function validateNationalBuild(opts: {
  buildDir: string;
  regionId: string;
  coveragePath: string;
  generationVersion: number;
  expectedSourceRevision: string;
  expectedConfigHash: string;
  forceMerge?: boolean;
  /** When true, run merge if catalogue.ndjson missing. */
  allowMerge?: boolean;
}): Promise<NationalValidationReport> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const buildDir = opts.buildDir;
  const manifest = loadManifest(buildDir);

  let ranMerge = false;
  let mergeSkippedReason: string | undefined;
  const alreadyComplete = mergeAlreadyComplete(buildDir);

  if (!alreadyComplete) {
    if (opts.allowMerge !== false) {
      const merge = await mergeNationalCatalogue({
        buildDir,
        coveragePath: opts.coveragePath,
        regionId: opts.regionId,
        generationVersion: opts.generationVersion,
        sourceRevision: opts.expectedSourceRevision,
        force: opts.forceMerge,
      });
      ranMerge = !merge.skipped;
      mergeSkippedReason = merge.reason;
    } else {
      errors.push("catalogue.ndjson_missing");
    }
  } else if (opts.forceMerge) {
    const merge = await mergeNationalCatalogue({
      buildDir,
      coveragePath: opts.coveragePath,
      regionId: opts.regionId,
      generationVersion: opts.generationVersion,
      sourceRevision: opts.expectedSourceRevision,
      force: true,
    });
    ranMerge = !merge.skipped;
  }

  // Re-load manifest after possible merge
  const m = loadManifest(buildDir);

  if (m.source_revision !== opts.expectedSourceRevision) {
    errors.push(
      `source_revision_mismatch:manifest=${m.source_revision} expected=${opts.expectedSourceRevision}`
    );
  }
  if (m.generator_config_hash !== opts.expectedConfigHash) {
    errors.push(
      `config_hash_mismatch:manifest=${m.generator_config_hash} expected=${opts.expectedConfigHash}`
    );
  }

  const chunks = Object.values(m.chunks);
  let completed = 0;
  let failed = 0;
  let pendingOrRunning = 0;
  let configHashMismatches = 0;
  let missingChunkFiles = 0;
  let chunkAcceptedSum = 0;

  for (const c of chunks) {
    chunkAcceptedSum += c.acceptedCount ?? 0;
    if (c.status === "completed") completed += 1;
    else if (c.status === "failed") failed += 1;
    else pendingOrRunning += 1;

    if (c.configHash && c.configHash !== m.generator_config_hash) {
      configHashMismatches += 1;
    }
    if (c.status === "completed") {
      const outPath =
        c.outputPath ?? path.join(buildDir, "chunks", `${c.chunkId}.ndjson`);
      if (!fs.existsSync(outPath)) missingChunkFiles += 1;
    }
  }

  if (completed !== m.total_chunks) {
    errors.push(`chunks_incomplete:completed=${completed} total=${m.total_chunks}`);
  }
  if (failed > 0) errors.push(`failed_chunks:${failed}`);
  if (pendingOrRunning > 0) errors.push(`pending_or_running_chunks:${pendingOrRunning}`);
  if (configHashMismatches > 0) {
    errors.push(`chunk_config_hash_mismatches:${configHashMismatches}`);
  }
  if (missingChunkFiles > 0) {
    warnings.push(`missing_chunk_ndjson_files:${missingChunkFiles}`);
  }

  const ndjsonPath = catalogueNdjsonPath(buildDir);
  const summaryPath = catalogueSummaryPath(buildDir);
  const validationJsonPath = path.join(buildDir, "validation.json");
  const validationTxtPath = path.join(buildDir, "validation-summary.txt");

  const ndjsonStats = {
    path: ndjsonPath,
    bytes: 0,
    rows: 0,
    malformed_rows: 0,
    duplicate_ids: 0,
    invalid_coords: 0,
    invalid_types: 0,
    invalid_source_type: 0,
    invalid_environment_profiles: 0,
    outside_coverage: 0,
    excluded_territory_hits: {
      isle_of_man: 0,
      jersey: 0,
      guernsey: 0,
    } as Record<string, number>,
    source_revision_mismatches: 0,
    generation_version_mismatches: 0,
    points_by_type: {} as Record<string, number>,
    min_spacing_m: null as number | null,
    below_spacing_150m_pairs: 0,
  };

  if (!fs.existsSync(ndjsonPath)) {
    errors.push("catalogue_ndjson_missing");
  } else {
    ndjsonStats.bytes = fs.statSync(ndjsonPath).size;
    const coverage = loadCoveragePolygons(opts.coveragePath);
    // Exact coverage for validation (no simplify) — bbox index only.
    const coverageIndex = prepareCoverageIndex(coverage);
    const seenIds = new Set<string>();
    const spacingGrid = new Map<string, CompactPoint[]>();
    const cellMetres = 150 / 2;
    let minSpacing = Infinity;

    const rl = readline.createInterface({
      input: createReadStream(ndjsonPath, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let row: Record<string, unknown>;
      try {
        row = JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        ndjsonStats.malformed_rows += 1;
        continue;
      }

      ndjsonStats.rows += 1;
      const id = typeof row.id === "string" ? row.id : "";
      if (!id) {
        ndjsonStats.malformed_rows += 1;
        continue;
      }
      if (seenIds.has(id)) ndjsonStats.duplicate_ids += 1;
      else seenIds.add(id);

      const lat = row.latitude;
      const lon = row.longitude;
      if (
        typeof lat !== "number" ||
        typeof lon !== "number" ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
      ) {
        ndjsonStats.invalid_coords += 1;
        continue;
      }

      const type = row.type;
      if (typeof type !== "number" || sourceTypeFromPointType(type) == null) {
        ndjsonStats.invalid_types += 1;
      } else {
        const expectedSource = sourceTypeFromPointType(type);
        if (row.source_type !== expectedSource) {
          ndjsonStats.invalid_source_type += 1;
        }
        ndjsonStats.points_by_type[String(type)] =
          (ndjsonStats.points_by_type[String(type)] ?? 0) + 1;
      }

      if (!isValidEnvironmentProfile(row.environment_profile)) {
        ndjsonStats.invalid_environment_profiles += 1;
      }

      if (row.source_revision !== opts.expectedSourceRevision) {
        ndjsonStats.source_revision_mismatches += 1;
      }
      if (row.generation_version !== opts.generationVersion) {
        ndjsonStats.generation_version_mismatches += 1;
      }

      if (!pointInCoverageIndex(lat, lon, coverageIndex)) {
        ndjsonStats.outside_coverage += 1;
      }

      for (const box of EXCLUDED_TERRITORY_BBOXES) {
        if (inExcludedBox(lat, lon, box)) {
          ndjsonStats.excluded_territory_hits[box.id] =
            (ndjsonStats.excluded_territory_hits[box.id] ?? 0) + 1;
        }
      }

      const sp = checkSpacingAgainstGrid(
        { latitude: lat, longitude: lon },
        spacingGrid,
        cellMetres,
        150
      );
      if (Number.isFinite(sp.nearest) && sp.nearest < minSpacing) {
        minSpacing = sp.nearest;
      }
      if (sp.violation) ndjsonStats.below_spacing_150m_pairs += 1;
    }

    ndjsonStats.min_spacing_m = Number.isFinite(minSpacing)
      ? Math.round(minSpacing * 10) / 10
      : null;

    if (ndjsonStats.malformed_rows > 0) {
      errors.push(`malformed_rows:${ndjsonStats.malformed_rows}`);
    }
    if (ndjsonStats.duplicate_ids > 0) {
      errors.push(`duplicate_ids:${ndjsonStats.duplicate_ids}`);
    }
    if (ndjsonStats.invalid_coords > 0) {
      errors.push(`invalid_coords:${ndjsonStats.invalid_coords}`);
    }
    if (ndjsonStats.invalid_types > 0) {
      errors.push(`invalid_types:${ndjsonStats.invalid_types}`);
    }
    if (ndjsonStats.invalid_source_type > 0) {
      errors.push(`invalid_source_type:${ndjsonStats.invalid_source_type}`);
    }
    if (ndjsonStats.invalid_environment_profiles > 0) {
      errors.push(
        `invalid_environment_profiles:${ndjsonStats.invalid_environment_profiles}`
      );
    }
    if (ndjsonStats.outside_coverage > 0) {
      errors.push(`outside_coverage:${ndjsonStats.outside_coverage}`);
    }
    if (ndjsonStats.source_revision_mismatches > 0) {
      errors.push(
        `ndjson_source_revision_mismatches:${ndjsonStats.source_revision_mismatches}`
      );
    }
    if (ndjsonStats.generation_version_mismatches > 0) {
      errors.push(
        `generation_version_mismatches:${ndjsonStats.generation_version_mismatches}`
      );
    }
    for (const [terr, n] of Object.entries(ndjsonStats.excluded_territory_hits)) {
      if (n > 0) errors.push(`excluded_territory_points:${terr}:${n}`);
    }
    if (ndjsonStats.below_spacing_150m_pairs > 0) {
      errors.push(`below_150m_spacing_pairs:${ndjsonStats.below_spacing_150m_pairs}`);
    }
    if (ndjsonStats.rows === 0) errors.push("empty_catalogue_ndjson");

    // Refresh summary to authoritative NDJSON row count (does not rewrite NDJSON).
    const summary = {
      region_id: opts.regionId,
      catalogue_build_id: m.catalogue_build_id,
      source_revision: m.source_revision,
      source_sha256: m.source_sha256,
      generation_version: opts.generationVersion,
      generated_at: new Date().toISOString(),
      point_count: ndjsonStats.rows - ndjsonStats.duplicate_ids,
      ndjson_row_count: ndjsonStats.rows,
      points_by_type: ndjsonStats.points_by_type,
      catalogue_ndjson: ndjsonPath,
      validation_ok: errors.length === 0,
      count_semantics: {
        chunk_accepted_sum: chunkAcceptedSum,
        manifest_aggregates_accepted: m.aggregates?.accepted ?? null,
        final_ndjson_unique_estimate: ndjsonStats.rows - ndjsonStats.duplicate_ids,
        note:
          "Final catalogue count is NDJSON unique rows after coverage filter + 150m spacing. " +
          "chunk_accepted_sum is pre-merge. aggregates.accepted was set at merge (may differ slightly if id-dedupe at write).",
      },
      note: "Not activated. Stoke remains active until explicit national activation.",
    };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  }

  const ok = errors.length === 0;
  m.validation_status = ok ? "ok" : "failed";
  if (m.aggregates && ndjsonStats.rows > 0) {
    m.aggregates = {
      ...m.aggregates,
      accepted: ndjsonStats.rows - ndjsonStats.duplicate_ids,
    };
  }
  saveManifest(buildDir, m);

  const report: NationalValidationReport = {
    ok,
    region_id: opts.regionId,
    build_dir: buildDir,
    catalogue_build_id: m.catalogue_build_id,
    validated_at: new Date().toISOString(),
    expected_source_revision: opts.expectedSourceRevision,
    expected_config_hash: opts.expectedConfigHash,
    merge: {
      already_complete: alreadyComplete,
      ran_merge: ranMerge,
      skipped_reason: mergeSkippedReason,
    },
    count_semantics: {
      chunk_accepted_sum: chunkAcceptedSum,
      note_chunk_accepted:
        "Sum of per-chunk acceptedCount — pre coverage-filter and pre global spacing",
      manifest_aggregates_accepted: m.aggregates?.accepted ?? null,
      note_aggregates:
        "Set at merge time — intended post coverage + spacing count (may include id-dedupe skew)",
      final_ndjson_rows: ndjsonStats.rows,
      note_final: "Authoritative final catalogue = unique rows in catalogue.ndjson",
    },
    checkpoints: {
      total_chunks: m.total_chunks,
      completed,
      failed,
      pending_or_running: pendingOrRunning,
      config_hash_mismatches: configHashMismatches,
      missing_chunk_files: missingChunkFiles,
      all_completed: completed === m.total_chunks && pendingOrRunning === 0,
      zero_failed: failed === 0,
      hashes_match_expected:
        m.generator_config_hash === opts.expectedConfigHash &&
        configHashMismatches === 0,
    },
    ndjson: ndjsonStats,
    errors,
    warnings,
    outputs: {
      validation_json: validationJsonPath,
      validation_summary_txt: validationTxtPath,
      catalogue_ndjson: ndjsonPath,
      catalogue_summary_json: summaryPath,
    },
  };

  fs.writeFileSync(validationJsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(validationTxtPath, formatValidationSummary(report));

  return report;
}

export function formatValidationSummary(report: NationalValidationReport): string {
  const lines = [
    `Huntly Explore — National catalogue validation`,
    `=============================================`,
    `Result: ${report.ok ? "PASS" : "FAIL"}`,
    `Build: ${report.catalogue_build_id}`,
    `Dir: ${report.build_dir}`,
    `Validated at: ${report.validated_at}`,
    ``,
    `Count semantics`,
    `---------------`,
    `chunk_accepted_sum (pre-merge): ${report.count_semantics.chunk_accepted_sum}`,
    `manifest aggregates.accepted: ${report.count_semantics.manifest_aggregates_accepted}`,
    `final NDJSON rows: ${report.count_semantics.final_ndjson_rows}`,
    `→ Authoritative final point count = final NDJSON unique rows (post coverage + 150m spacing).`,
    ``,
    `Checkpoints`,
    `-----------`,
    `completed: ${report.checkpoints.completed} / ${report.checkpoints.total_chunks}`,
    `failed: ${report.checkpoints.failed}`,
    `config hash OK: ${report.checkpoints.hashes_match_expected}`,
    `source revision expected: ${report.expected_source_revision}`,
    `config hash expected: ${report.expected_config_hash}`,
    ``,
    `NDJSON`,
    `------`,
    `path: ${report.ndjson.path}`,
    `size_bytes: ${report.ndjson.bytes}`,
    `rows: ${report.ndjson.rows}`,
    `malformed: ${report.ndjson.malformed_rows}`,
    `duplicate_ids: ${report.ndjson.duplicate_ids}`,
    `outside_coverage: ${report.ndjson.outside_coverage}`,
    `min_spacing_m: ${report.ndjson.min_spacing_m}`,
    `below_150m_pairs: ${report.ndjson.below_spacing_150m_pairs}`,
    `excluded IoM/Jersey/Guernsey: ${JSON.stringify(report.ndjson.excluded_territory_hits)}`,
    `points_by_type: ${JSON.stringify(report.ndjson.points_by_type)}`,
    ``,
    `Errors (${report.errors.length})`,
    ...report.errors.map((e) => ` - ${e}`),
    ``,
    `Warnings (${report.warnings.length})`,
    ...report.warnings.map((w) => ` - ${w}`),
    ``,
    `Outputs`,
    `-------`,
    `validation.json: ${report.outputs.validation_json}`,
    `validation-summary.txt: ${report.outputs.validation_summary_txt}`,
    `catalogue.ndjson: ${report.outputs.catalogue_ndjson}`,
    `catalogue-summary.json: ${report.outputs.catalogue_summary_json}`,
    ``,
    `Import/activate/Stoke retirement: NOT performed.`,
  ];
  return lines.join("\n") + "\n";
}

export type { BuildManifest };
