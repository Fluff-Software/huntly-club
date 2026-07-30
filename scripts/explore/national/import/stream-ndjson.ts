/**
 * Streaming NDJSON reader for national catalogue import (no full-memory load).
 */
import fs from "node:fs";
import readline from "node:readline";
import { createReadStream } from "node:fs";
import crypto from "node:crypto";
import { sourceTypeFromPointType } from "../../point-types.js";

export type NationalPointRow = {
  id: string;
  latitude: number;
  longitude: number;
  type: number;
  source_type: string;
  generation_version: number;
  source_revision: string;
  source_feature_id?: string | null;
  confidence?: number | null;
  environment_profile: Record<string, number>;
};

export type StreamScanStats = {
  rows: number;
  malformed: number;
  duplicateIds: number;
  invalidCoords: number;
  invalidTypes: number;
  invalidSourceType: number;
  invalidEnvironment: number;
  pointsByType: Record<string, number>;
  sha256: string;
  bytes: number;
  estimatedCopyBytes: number;
  envProfileBytesSum: number;
  envProfileBytesMax: number;
};

const ENV_KEYS = new Set([
  "freshwater",
  "wetland",
  "woodland",
  "grassland",
  "farmland",
  "urban",
  "park_garden",
  "general",
]);

export function isValidEnvironmentProfile(v: unknown): boolean {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return false;
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (!ENV_KEYS.has(k)) return false;
    if (typeof val !== "number" || !Number.isFinite(val) || val < 0) return false;
  }
  return true;
}

export function parseNationalPointLine(line: string): NationalPointRow {
  const row = JSON.parse(line) as Record<string, unknown>;
  if (typeof row.id !== "string" || !row.id) throw new Error("missing_id");
  if (typeof row.latitude !== "number" || typeof row.longitude !== "number") {
    throw new Error("missing_coords");
  }
  if (typeof row.type !== "number") throw new Error("missing_type");
  if (typeof row.source_type !== "string") throw new Error("missing_source_type");
  if (typeof row.generation_version !== "number") throw new Error("missing_generation");
  if (typeof row.source_revision !== "string") throw new Error("missing_revision");
  if (!isValidEnvironmentProfile(row.environment_profile)) {
    throw new Error("invalid_environment_profile");
  }
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    type: row.type,
    source_type: row.source_type,
    generation_version: row.generation_version,
    source_revision: row.source_revision,
    source_feature_id:
      typeof row.source_feature_id === "string" ? row.source_feature_id : null,
    confidence: typeof row.confidence === "number" ? row.confidence : null,
    environment_profile: row.environment_profile as Record<string, number>,
  };
}

/** Escape a field for PostgreSQL COPY CSV. */
export function copyCsvField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * One CSV line for staging COPY (import_job_id prepended by caller or included).
 */
export function pointToCopyCsvLine(jobId: string, p: NationalPointRow): string {
  const envJson = JSON.stringify(p.environment_profile);
  return [
    copyCsvField(jobId),
    copyCsvField(p.id),
    copyCsvField(p.latitude),
    copyCsvField(p.longitude),
    copyCsvField(p.type),
    copyCsvField(p.generation_version),
    copyCsvField(p.source_revision),
    copyCsvField(p.source_type),
    copyCsvField(p.source_feature_id ?? ""),
    copyCsvField(p.confidence ?? ""),
    copyCsvField(envJson),
  ].join(",") + "\n";
}

/**
 * Stream-scan NDJSON: sha256, counts, validation. Optionally track IDs for dupes
 * using a Set (IDs only — not full rows). ~777k string ids ≈ tens of MB, acceptable.
 */
export async function streamScanNationalNdjson(
  ndjsonPath: string,
  options?: { trackIds?: boolean; onProgress?: (rows: number) => void }
): Promise<StreamScanStats> {
  const hash = crypto.createHash("sha256");
  const trackIds = options?.trackIds !== false;
  const seen = trackIds ? new Set<string>() : null;
  const stats: StreamScanStats = {
    rows: 0,
    malformed: 0,
    duplicateIds: 0,
    invalidCoords: 0,
    invalidTypes: 0,
    invalidSourceType: 0,
    invalidEnvironment: 0,
    pointsByType: {},
    sha256: "",
    bytes: fs.statSync(ndjsonPath).size,
    estimatedCopyBytes: 0,
    envProfileBytesSum: 0,
    envProfileBytesMax: 0,
  };

  const rl = readline.createInterface({
    input: createReadStream(ndjsonPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    hash.update(line);
    hash.update("\n");
    const trimmed = line.trim();
    if (!trimmed) continue;
    let p: NationalPointRow;
    try {
      p = parseNationalPointLine(trimmed);
    } catch {
      stats.malformed += 1;
      continue;
    }

    if (
      !Number.isFinite(p.latitude) ||
      !Number.isFinite(p.longitude) ||
      p.latitude < -90 ||
      p.latitude > 90 ||
      p.longitude < -180 ||
      p.longitude > 180
    ) {
      stats.invalidCoords += 1;
      continue;
    }
    if (sourceTypeFromPointType(p.type) == null) {
      stats.invalidTypes += 1;
      continue;
    }
    if (sourceTypeFromPointType(p.type) !== p.source_type) {
      stats.invalidSourceType += 1;
    }
    if (!isValidEnvironmentProfile(p.environment_profile)) {
      stats.invalidEnvironment += 1;
      continue;
    }

    if (seen) {
      if (seen.has(p.id)) stats.duplicateIds += 1;
      else seen.add(p.id);
    }

    stats.rows += 1;
    stats.pointsByType[String(p.type)] = (stats.pointsByType[String(p.type)] ?? 0) + 1;
    const envBytes = Buffer.byteLength(JSON.stringify(p.environment_profile), "utf8");
    stats.envProfileBytesSum += envBytes;
    if (envBytes > stats.envProfileBytesMax) stats.envProfileBytesMax = envBytes;
    // Rough COPY CSV estimate (job uuid + fields)
    stats.estimatedCopyBytes += Buffer.byteLength(trimmed, "utf8") + 40;

    if (options?.onProgress && stats.rows % 50_000 === 0) {
      options.onProgress(stats.rows);
    }
  }

  stats.sha256 = hash.digest("hex");
  return stats;
}

/**
 * Async generator yielding parsed points (streaming).
 */
export async function* iterateNationalPoints(
  ndjsonPath: string
): AsyncGenerator<NationalPointRow> {
  const rl = readline.createInterface({
    input: createReadStream(ndjsonPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    yield parseNationalPointLine(trimmed);
  }
}
