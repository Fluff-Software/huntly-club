/**
 * Stable Explore point_type integers (must match scripts/explore/point-types.ts).
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
  11: "pedestrian",
} as const;

export type ExplorePointTypeCode = keyof typeof EXPLORE_POINT_TYPES;

export function sourceTypeFromPointType(code: number): string | null {
  if (!Number.isInteger(code)) return null;
  return (EXPLORE_POINT_TYPES as Record<number, string>)[code] ?? null;
}

export function pointTypeLabel(code: number): string {
  const source = sourceTypeFromPointType(code);
  if (!source) return `unknown(${code})`;
  return source.replace(/_/g, " ");
}
