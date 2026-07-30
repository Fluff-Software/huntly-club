/**
 * National catalogue build manifest + atomic chunk checkpoints (Step 10.4).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type ChunkStatus = "pending" | "running" | "completed" | "failed";

export type ChunkCheckpoint = {
  chunkId: string;
  status: ChunkStatus;
  acceptedCount?: number;
  candidateCount?: number;
  rejectedCount?: number;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  outputPath?: string;
  configHash?: string;
};

export type BuildManifest = {
  region_id: string;
  catalogue_build_id: string;
  source_revision: string;
  source_sha256: string | null;
  generation_version: number;
  point_type_mapping_version: number;
  generator_config_hash: string;
  chunk_span_degrees: number;
  pad_metres: number;
  total_chunks: number;
  chunks: Record<string, ChunkCheckpoint>;
  validation_status: "not_started" | "ok" | "failed";
  started_at: string;
  updated_at: string;
  machine?: {
    platform: string;
    node: string;
  };
  aggregates?: {
    accepted: number;
    candidates: number;
    rejected: number;
  };
};

export function newCatalogueBuildId(now = new Date()): string {
  const ts = now.toISOString().replace(/[:.]/g, "-");
  const rand = crypto.randomBytes(3).toString("hex");
  return `build_${ts}_${rand}`;
}

export function hashConfig(parts: Record<string, unknown>): string {
  return crypto.createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

export function createBuildManifest(opts: {
  regionId: string;
  catalogueBuildId: string;
  sourceRevision: string;
  sourceSha256: string | null;
  generationVersion: number;
  chunkSpanDegrees: number;
  padMetres: number;
  chunkIds: string[];
  generatorConfigHash: string;
}): BuildManifest {
  const now = new Date().toISOString();
  const chunks: Record<string, ChunkCheckpoint> = {};
  for (const id of opts.chunkIds) {
    chunks[id] = { chunkId: id, status: "pending" };
  }
  return {
    region_id: opts.regionId,
    catalogue_build_id: opts.catalogueBuildId,
    source_revision: opts.sourceRevision,
    source_sha256: opts.sourceSha256,
    generation_version: opts.generationVersion,
    point_type_mapping_version: 1,
    generator_config_hash: opts.generatorConfigHash,
    chunk_span_degrees: opts.chunkSpanDegrees,
    pad_metres: opts.padMetres,
    total_chunks: opts.chunkIds.length,
    chunks,
    validation_status: "not_started",
    started_at: now,
    updated_at: now,
    machine: {
      platform: process.platform,
      node: process.version,
    },
  };
}

export function manifestPath(buildDir: string): string {
  return path.join(buildDir, "build-manifest.json");
}

export function loadManifest(buildDir: string): BuildManifest {
  const p = manifestPath(buildDir);
  if (!fs.existsSync(p)) throw new Error(`Missing build manifest: ${p}`);
  return JSON.parse(fs.readFileSync(p, "utf8")) as BuildManifest;
}

/** Atomic write via temp + rename. */
export function saveManifest(buildDir: string, manifest: BuildManifest): void {
  fs.mkdirSync(buildDir, { recursive: true });
  const p = manifestPath(buildDir);
  const tmp = `${p}.${process.pid}.tmp`;
  manifest.updated_at = new Date().toISOString();
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2));
  fs.renameSync(tmp, p);
}

export function updateChunkCheckpoint(
  buildDir: string,
  update: ChunkCheckpoint
): BuildManifest {
  const manifest = loadManifest(buildDir);
  const prev = manifest.chunks[update.chunkId];
  if (!prev) throw new Error(`Unknown chunk ${update.chunkId}`);
  if (
    update.configHash &&
    manifest.generator_config_hash &&
    update.configHash !== manifest.generator_config_hash
  ) {
    throw new Error(
      `Chunk ${update.chunkId} config hash mismatch (refusing to mix generator configs)`
    );
  }
  manifest.chunks[update.chunkId] = { ...prev, ...update };
  saveManifest(buildDir, manifest);
  return manifest;
}

export function listChunksByStatus(
  manifest: BuildManifest,
  status: ChunkStatus
): ChunkCheckpoint[] {
  return Object.values(manifest.chunks).filter((c) => c.status === status);
}

export function resumeEligibleChunkIds(manifest: BuildManifest): string[] {
  return Object.values(manifest.chunks)
    .filter((c) => c.status === "pending" || c.status === "failed" || c.status === "running")
    .map((c) => c.chunkId)
    .sort();
}
