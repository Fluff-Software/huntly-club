/**
 * National import preflight (local + optional DB checks). Does not mutate DB.
 */
import fs from "node:fs";
import path from "node:path";
import {
  NATIONAL_BUILD_ID,
  NATIONAL_CONFIG_HASH,
  NATIONAL_EXPECTED_POINT_COUNT,
  NATIONAL_NDJSON_SHA256,
  NATIONAL_POINTS_BY_TYPE,
  NATIONAL_SOURCE_REVISION,
  STOKE_REGION_ID,
} from "./constants.js";
import { streamScanNationalNdjson } from "./stream-ndjson.js";

export type PreflightResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  buildDir: string;
  ndjsonPath: string;
  validationPath: string;
  expectedPointCount: number;
  scannedRows?: number;
  sha256?: string;
  pointsByType?: Record<string, number>;
  dbChecks?: Record<string, unknown>;
};

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "[unparseable-url]";
  }
}

export async function runNationalImportPreflight(opts: {
  buildDir: string;
  expectedSourceRevision?: string;
  expectedConfigHash?: string;
  expectedPointCount?: number;
  expectedSha256?: string;
  skipStreamScan?: boolean;
  databaseUrl?: string | null;
  supabaseUrl?: string | null;
  hasServiceRole?: boolean;
  /** Optional live DB probe (passed in by CLI when configured). */
  dbProbe?: () => Promise<{
    postgis: boolean;
    migrationHint: boolean;
    stokeActive: boolean;
    conflictingNational: boolean;
    encrypted: boolean | null;
  }>;
}): Promise<PreflightResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const buildDir = opts.buildDir;
  const ndjsonPath = path.join(buildDir, "catalogue.ndjson");
  const validationPath = path.join(buildDir, "validation.json");
  const expectedRev = opts.expectedSourceRevision ?? NATIONAL_SOURCE_REVISION;
  const expectedHash = opts.expectedConfigHash ?? NATIONAL_CONFIG_HASH;
  const expectedCount = opts.expectedPointCount ?? NATIONAL_EXPECTED_POINT_COUNT;
  const expectedSha = opts.expectedSha256 ?? NATIONAL_NDJSON_SHA256;

  if (!fs.existsSync(ndjsonPath)) errors.push(`missing_ndjson:${ndjsonPath}`);
  if (!fs.existsSync(validationPath)) errors.push(`missing_validation:${validationPath}`);

  let validationOk = false;
  if (fs.existsSync(validationPath)) {
    try {
      const v = JSON.parse(fs.readFileSync(validationPath, "utf8")) as {
        ok?: boolean;
        expected_source_revision?: string;
        expected_config_hash?: string;
        ndjson?: { rows?: number };
        catalogue_build_id?: string;
      };
      if (v.ok !== true) errors.push("validation_status_not_ok");
      else validationOk = true;
      if (v.expected_source_revision && v.expected_source_revision !== expectedRev) {
        errors.push(
          `validation_source_revision_mismatch:${v.expected_source_revision}`
        );
      }
      if (v.expected_config_hash && v.expected_config_hash !== expectedHash) {
        errors.push(`validation_config_hash_mismatch:${v.expected_config_hash}`);
      }
      if (v.ndjson?.rows != null && v.ndjson.rows !== expectedCount) {
        errors.push(
          `validation_row_count_mismatch:got=${v.ndjson.rows} expected=${expectedCount}`
        );
      }
      if (v.catalogue_build_id && v.catalogue_build_id !== NATIONAL_BUILD_ID) {
        warnings.push(`build_id_differs_from_canonical:${v.catalogue_build_id}`);
      }
    } catch {
      errors.push("validation_json_unreadable");
    }
  }

  if (!opts.supabaseUrl && !opts.databaseUrl) {
    warnings.push("no_supabase_or_database_url_in_env — DB checks skipped");
  } else if (!opts.hasServiceRole && !opts.databaseUrl) {
    errors.push("missing_service_role_or_database_url");
  }

  if (opts.supabaseUrl) {
    const redacted = redactUrl(opts.supabaseUrl);
    if (!redacted.startsWith("https:") && !redacted.includes("127.0.0.1")) {
      warnings.push(`supabase_url_not_https:${redacted}`);
    }
  }

  let scannedRows: number | undefined;
  let sha256: string | undefined;
  let pointsByType: Record<string, number> | undefined;

  if (!opts.skipStreamScan && fs.existsSync(ndjsonPath) && validationOk) {
    const scan = await streamScanNationalNdjson(ndjsonPath);
    scannedRows = scan.rows;
    sha256 = scan.sha256;
    pointsByType = scan.pointsByType;
    if (scan.malformed > 0) errors.push(`malformed_rows:${scan.malformed}`);
    if (scan.duplicateIds > 0) errors.push(`duplicate_ids:${scan.duplicateIds}`);
    if (scan.invalidCoords > 0) errors.push(`invalid_coords:${scan.invalidCoords}`);
    if (scan.invalidTypes > 0) errors.push(`invalid_types:${scan.invalidTypes}`);
    if (scan.invalidEnvironment > 0) {
      errors.push(`invalid_environment:${scan.invalidEnvironment}`);
    }
    if (scan.rows !== expectedCount) {
      errors.push(`row_count_mismatch:got=${scan.rows} expected=${expectedCount}`);
    }
    if (scan.sha256 !== expectedSha) {
      errors.push(`sha256_mismatch:got=${scan.sha256} expected=${expectedSha}`);
    }
    for (const [t, n] of Object.entries(NATIONAL_POINTS_BY_TYPE)) {
      if ((scan.pointsByType[t] ?? 0) !== n) {
        errors.push(`type_count_mismatch:type=${t} got=${scan.pointsByType[t] ?? 0} expected=${n}`);
      }
    }
  }

  let dbChecks: Record<string, unknown> | undefined;
  if (opts.dbProbe) {
    try {
      const probe = await opts.dbProbe();
      dbChecks = { ...probe, stoke_region: STOKE_REGION_ID };
      if (!probe.postgis) errors.push("postgis_unavailable");
      if (!probe.migrationHint) {
        warnings.push(
          "explore_catalogue_import_jobs table missing — run: supabase db push"
        );
      }
      if (!probe.stokeActive) {
        warnings.push("stoke_not_active — unexpected for Step 10.5");
      }
      if (probe.conflictingNational) {
        errors.push("conflicting_ready_or_active_national_catalogue");
      }
      if (probe.encrypted === false) {
        errors.push("database_connection_not_encrypted");
      }
    } catch (e) {
      warnings.push(`db_probe_failed:${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    buildDir,
    ndjsonPath,
    validationPath,
    expectedPointCount: expectedCount,
    scannedRows,
    sha256,
    pointsByType,
    dbChecks,
  };
}
