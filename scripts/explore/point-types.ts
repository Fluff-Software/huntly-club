/**
 * Stable Explore point_type integers.
 * Never silently reassign meanings — deprecate instead.
 */
export const EXPLORE_POINT_TYPES = {
  1: "footpath",
  2: "path",
  3: "sidewalk",
  4: "cycleway_walk",
  5: "plaza",
  6: "park",
  7: "garden",
  8: "recreation_ground",
  9: "common",
  10: "venue",
  /** Reserved — classifier currently maps highway=pedestrian → plaza */
  11: "pedestrian",
} as const;

export type ExplorePointTypeCode = keyof typeof EXPLORE_POINT_TYPES;
export type ExplorePointSourceType = (typeof EXPLORE_POINT_TYPES)[ExplorePointTypeCode];

const SOURCE_TO_TYPE: Record<string, ExplorePointTypeCode> = {
  footpath: 1,
  path: 2,
  sidewalk: 3,
  cycleway_walk: 4,
  plaza: 5,
  park: 6,
  garden: 7,
  recreation_ground: 8,
  common: 9,
  venue: 10,
  pedestrian: 11,
};

export function pointTypeFromSourceType(sourceType: string): ExplorePointTypeCode | null {
  const code = SOURCE_TO_TYPE[sourceType];
  return code ?? null;
}

export function sourceTypeFromPointType(code: number): ExplorePointSourceType | null {
  if (!Number.isInteger(code)) return null;
  const label = EXPLORE_POINT_TYPES[code as ExplorePointTypeCode];
  return label ?? null;
}

export function assertKnownPointType(code: number): ExplorePointTypeCode {
  if (!(code in EXPLORE_POINT_TYPES)) {
    throw new Error(`unknown_point_type:${code}`);
  }
  return code as ExplorePointTypeCode;
}

/** Short labels for DEV / UI (not product copy). */
export function pointTypeLabel(code: number): string {
  const source = sourceTypeFromPointType(code);
  if (!source) return `unknown(${code})`;
  return source.replace(/_/g, " ");
}
