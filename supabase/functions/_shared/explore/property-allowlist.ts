/**
 * OSM property allowlist derived from generator/safety/environment/confidence code.
 * Do not remove a key without confirming it is unused.
 */
export const OSM_PROPERTY_ALLOWLIST = [
  "id",
  "highway",
  "footway",
  "sidewalk",
  "foot",
  "bicycle",
  "access",
  "access:foot",
  "foot:signed",
  "leisure",
  "landuse",
  "natural",
  "waterway",
  "railway",
  "building",
  "place",
  "amenity",
  "shop",
  "barrier",
  "entrance",
  "name",
  "tourism",
  "towpath",
  "surface",
  "explore_source",
  "explore_role",
] as const;

export type AllowedOsmProperty = (typeof OSM_PROPERTY_ALLOWLIST)[number];

const ALLOW_SET = new Set<string>(OSM_PROPERTY_ALLOWLIST);

export function filterOsmProperties(
  props: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!props) return out;
  for (const [k, v] of Object.entries(props)) {
    if (!ALLOW_SET.has(k)) continue;
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}
