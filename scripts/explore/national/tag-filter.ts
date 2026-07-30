/**
 * Shared OSM tag / property allowlist for national PBF extraction (Step 10.4).
 * Derived from generator + safety + environment + confidence needs.
 * Do not drop a key without proving it is unused.
 */
export {
  OSM_PROPERTY_ALLOWLIST,
  filterOsmProperties,
  type AllowedOsmProperty,
} from "../edge-compat/property-allowlist.js";

/**
 * Osmium / Overpass-style tag filters used when extracting from PBF.
 * Keep in sync with buildOverpassQuery + safety-rules classifySourceType.
 */
export const PBF_TAG_FILTER_GROUPS = [
  { key: "highway", values: ["*"] },
  { key: "leisure", values: ["*"] },
  { key: "landuse", values: ["*"] },
  { key: "natural", values: ["*"] },
  { key: "waterway", values: ["*"] },
  { key: "railway", values: ["*"] },
  { key: "building", values: ["*"] },
  { key: "barrier", values: ["*"] },
  { key: "amenity", values: ["*"] },
  { key: "shop", values: ["*"] },
  { key: "entrance", values: ["*"] },
  { key: "place", values: ["*"] },
  { key: "tourism", values: ["*"] },
] as const;

/** Human-readable notes for docs / osmium filter files. */
export const PBF_FILTER_NOTES = `
Retain ways/nodes/relations tagged with any of the Huntly safety/generator keys.
Preserve stable OSM ids (type/id). Keep multipolygon relations for leisure/landuse/natural.
After geometry extract, strip properties to OSM_PROPERTY_ALLOWLIST only.
`.trim();
