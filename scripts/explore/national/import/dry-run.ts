/**
 * Dry-run national import: stream + reconcile, no DB writes.
 */
import {
  NATIONAL_EXPECTED_POINT_COUNT,
  NATIONAL_NDJSON_SHA256,
  NATIONAL_POINTS_BY_TYPE,
} from "./constants.js";
import { streamScanNationalNdjson, type StreamScanStats } from "./stream-ndjson.js";

export type DryRunResult = {
  ok: boolean;
  errors: string[];
  stats: StreamScanStats;
  expectedPointCount: number;
  estimatedDbBytes: number;
  envProfileAvgBytes: number;
  envProfileMaxBytes: number;
  inserts: false;
  activation: false;
  stagingRowsLeft: 0;
};

export async function runNationalImportDryRun(opts: {
  ndjsonPath: string;
  expectedPointCount?: number;
  expectedSha256?: string;
}): Promise<DryRunResult> {
  const expected = opts.expectedPointCount ?? NATIONAL_EXPECTED_POINT_COUNT;
  const expectedSha = opts.expectedSha256 ?? NATIONAL_NDJSON_SHA256;
  const errors: string[] = [];
  const stats = await streamScanNationalNdjson(opts.ndjsonPath, {
    onProgress: (n) => console.log(`  scanned ${n} rows…`),
  });

  if (stats.rows !== expected) {
    errors.push(`row_count:got=${stats.rows} expected=${expected}`);
  }
  if (stats.sha256 !== expectedSha) {
    errors.push(`sha256_mismatch`);
  }
  if (stats.malformed > 0) errors.push(`malformed:${stats.malformed}`);
  if (stats.duplicateIds > 0) errors.push(`duplicates:${stats.duplicateIds}`);
  if (stats.invalidCoords > 0) errors.push(`invalid_coords:${stats.invalidCoords}`);
  if (stats.invalidTypes > 0) errors.push(`invalid_types:${stats.invalidTypes}`);
  if (stats.invalidEnvironment > 0) {
    errors.push(`invalid_environment:${stats.invalidEnvironment}`);
  }
  for (const [t, n] of Object.entries(NATIONAL_POINTS_BY_TYPE)) {
    if ((stats.pointsByType[t] ?? 0) !== n) {
      errors.push(`type_${t}:got=${stats.pointsByType[t] ?? 0} expected=${n}`);
    }
  }

  const envAvg = stats.rows > 0 ? stats.envProfileBytesSum / stats.rows : 0;
  // Rough: row ~120 bytes fixed + env + indexes overhead ~2×
  const estimatedDbBytes = Math.round(stats.rows * (140 + envAvg) * 2.2);

  return {
    ok: errors.length === 0,
    errors,
    stats,
    expectedPointCount: expected,
    estimatedDbBytes,
    envProfileAvgBytes: Math.round(envAvg * 10) / 10,
    envProfileMaxBytes: stats.envProfileBytesMax,
    inserts: false,
    activation: false,
    stagingRowsLeft: 0,
  };
}
