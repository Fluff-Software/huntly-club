/**
 * Deterministic string hashing for Explore stop generation.
 * Uses FNV-1a 32-bit — stable across Node versions, no crypto randomness.
 */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** Unsigned 32-bit FNV-1a hash of a UTF-8 string. */
export function fnv1a32(input: string): number {
  let hash = FNV_OFFSET;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/** Lowercase hex of FNV-1a (8 chars). */
export function stableHashHex(input: string): string {
  return fnv1a32(input).toString(16).padStart(8, "0");
}

/** Non-negative integer in [0, modulo). */
export function stableHashMod(input: string, modulo: number): number {
  if (modulo <= 0) throw new Error("modulo must be positive");
  return fnv1a32(input) % modulo;
}

/**
 * Public stop ID once a candidate is accepted.
 * Includes final rounded lat/lon so the ID encodes the resolved position.
 */
export function buildStopId(parts: {
  generationVersion: number;
  sourceType: string;
  sourceFeatureId: string;
  candidateIndex: number;
  latitude: number;
  longitude: number;
  coordinateDecimals: number;
}): string {
  const lat = parts.latitude.toFixed(parts.coordinateDecimals);
  const lon = parts.longitude.toFixed(parts.coordinateDecimals);
  const material = [
    `v${parts.generationVersion}`,
    parts.sourceType,
    parts.sourceFeatureId,
    `c${parts.candidateIndex}`,
    lat,
    lon,
  ].join("|");
  return `stop_${stableHashHex(material)}`;
}

/** Internal candidate identity before alternatives / final position. */
export function buildCandidateId(parts: {
  generationVersion: number;
  sourceType: string;
  sourceFeatureId: string;
  candidateIndex: number;
}): string {
  const material = [
    `v${parts.generationVersion}`,
    parts.sourceType,
    parts.sourceFeatureId,
    `c${parts.candidateIndex}`,
  ].join("|");
  return `cand_${stableHashHex(material)}`;
}

/** Spacing priority — higher lexical hex sorts first after we sort descending by number. */
export function buildPriorityKey(parts: {
  generationVersion: number;
  sourceType: string;
  sourceFeatureId: string;
  candidateIndex: number;
}): string {
  const material = [
    "priority",
    `v${parts.generationVersion}`,
    parts.sourceType,
    parts.sourceFeatureId,
    `c${parts.candidateIndex}`,
  ].join("|");
  return stableHashHex(material);
}
