/**
 * Resolve national import target metadata from a validated build directory.
 * UK constants remain the legacy default when the build is the pinned UK catalogue.
 */
import fs from "node:fs";
import path from "node:path";
import {
  NATIONAL_BUILD_ID,
  NATIONAL_CONFIG_HASH,
  NATIONAL_EXPECTED_POINT_COUNT,
  NATIONAL_GENERATION_VERSION,
  NATIONAL_NDJSON_SHA256,
  NATIONAL_POINTS_BY_TYPE,
  NATIONAL_REGION_ID,
  NATIONAL_SOURCE_REVISION,
} from "./constants.js";

export type NationalImportTarget = {
  regionId: string;
  catalogueBuildId: string;
  sourceRevision: string;
  generatorConfigHash: string;
  generationVersion: number;
  expectedPointCount: number;
  /** When set, dry-run/preflight enforce this SHA. When omitted, scan SHA is recorded only. */
  ndjsonSha256?: string;
  pointsByType: Record<string, number>;
  enforcePointsByType: boolean;
  enforceNdjsonSha256: boolean;
};

function readJson(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function ukLegacyTarget(): NationalImportTarget {
  return {
    regionId: NATIONAL_REGION_ID,
    catalogueBuildId: NATIONAL_BUILD_ID,
    sourceRevision: NATIONAL_SOURCE_REVISION,
    generatorConfigHash: NATIONAL_CONFIG_HASH,
    generationVersion: NATIONAL_GENERATION_VERSION,
    expectedPointCount: NATIONAL_EXPECTED_POINT_COUNT,
    ndjsonSha256: NATIONAL_NDJSON_SHA256,
    pointsByType: { ...NATIONAL_POINTS_BY_TYPE },
    enforcePointsByType: true,
    enforceNdjsonSha256: true,
  };
}

/**
 * Build import target from catalogue-summary / validation / manifest.
 * Falls back to UK legacy pin only when regionId is uk-and-ireland and files are incomplete.
 */
export function resolveNationalImportTarget(opts: {
  buildDir: string;
  regionId?: string;
}): NationalImportTarget {
  const buildDir = opts.buildDir;
  const summary = readJson(path.join(buildDir, "catalogue-summary.json"));
  const validation = readJson(path.join(buildDir, "validation.json"));
  const manifest = readJson(path.join(buildDir, "build-manifest.json"));

  const regionId =
    opts.regionId ??
    String(summary?.region_id ?? validation?.region_id ?? manifest?.region_id ?? "");

  if (!regionId) {
    throw new Error(`Could not resolve region_id from buildDir=${buildDir}`);
  }

  if (regionId === NATIONAL_REGION_ID) {
    // Prefer on-disk artifacts when present; else legacy constants.
    const ndjsonRows =
      typeof (validation?.ndjson as { rows?: number } | undefined)?.rows === "number"
        ? (validation!.ndjson as { rows: number }).rows
        : typeof summary?.point_count === "number"
          ? (summary.point_count as number)
          : NATIONAL_EXPECTED_POINT_COUNT;
    return {
      regionId: NATIONAL_REGION_ID,
      catalogueBuildId: String(
        summary?.catalogue_build_id ??
          validation?.catalogue_build_id ??
          manifest?.catalogue_build_id ??
          NATIONAL_BUILD_ID
      ),
      sourceRevision: String(
        summary?.source_revision ??
          validation?.expected_source_revision ??
          manifest?.source_revision ??
          NATIONAL_SOURCE_REVISION
      ),
      generatorConfigHash: String(
        validation?.expected_config_hash ??
          manifest?.generator_config_hash ??
          NATIONAL_CONFIG_HASH
      ),
      generationVersion: Number(
        summary?.generation_version ??
          manifest?.generation_version ??
          NATIONAL_GENERATION_VERSION
      ),
      expectedPointCount: ndjsonRows,
      ndjsonSha256: NATIONAL_NDJSON_SHA256,
      pointsByType:
        (summary?.points_by_type as Record<string, number> | undefined) ?? {
          ...NATIONAL_POINTS_BY_TYPE,
        },
      enforcePointsByType: true,
      enforceNdjsonSha256: true,
    };
  }

  const ndjsonRows =
    typeof (validation?.ndjson as { rows?: number } | undefined)?.rows === "number"
      ? (validation!.ndjson as { rows: number }).rows
      : typeof summary?.point_count === "number"
        ? (summary.point_count as number)
        : null;
  if (ndjsonRows == null) {
    throw new Error(`Missing point count in validation/summary for ${regionId}`);
  }

  const sourceRevision = String(
    summary?.source_revision ??
      validation?.expected_source_revision ??
      manifest?.source_revision ??
      ""
  );
  const generatorConfigHash = String(
    validation?.expected_config_hash ?? manifest?.generator_config_hash ?? ""
  );
  const catalogueBuildId = String(
    summary?.catalogue_build_id ??
      validation?.catalogue_build_id ??
      manifest?.catalogue_build_id ??
      path.basename(buildDir)
  );
  const generationVersion = Number(
    summary?.generation_version ?? manifest?.generation_version ?? 1
  );
  const pointsByType = (summary?.points_by_type as Record<string, number> | undefined) ?? {};
  const typeSum = Object.values(pointsByType).reduce((a, b) => a + Number(b), 0);

  if (!sourceRevision || !generatorConfigHash) {
    throw new Error(
      `Incomplete import target for ${regionId}: need source_revision + generator_config_hash`
    );
  }

  return {
    regionId,
    catalogueBuildId,
    sourceRevision,
    generatorConfigHash,
    generationVersion,
    expectedPointCount: ndjsonRows,
    pointsByType,
    // Only enforce type histogram when it reconciles with validated NDJSON row count.
    enforcePointsByType: Object.keys(pointsByType).length > 0 && typeSum === ndjsonRows,
    enforceNdjsonSha256: false,
  };
}

export { ukLegacyTarget };
