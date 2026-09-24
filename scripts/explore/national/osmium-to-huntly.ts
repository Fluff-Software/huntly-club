/**
 * Osmium GeoJSON / GeoJSONSeq → Huntly FeatureCollection (generator-compatible).
 * Does not load a whole national file — callers stream or pass chunk-sized collections.
 */
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { filterOsmProperties } from "./tag-filter.js";
import type { OsmLikeProperties } from "../types.js";

const PRESERVE = new Set([
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
]);

function stableOsmId(props: Record<string, unknown>): string | null {
  if (typeof props.id === "string" && /^(node|way|relation)\//.test(props.id)) {
    return props.id;
  }
  // osmium --add-unique-id=type_id → n123 / w456 / r789
  if (typeof props.id === "string") {
    const m = /^([nwr])(-?\d+)$/i.exec(props.id);
    if (m) {
      const t = m[1]!.toLowerCase() === "n" ? "node" : m[1]!.toLowerCase() === "w" ? "way" : "relation";
      return `${t}/${m[2]}`;
    }
  }
  const osmType = props.osm_type ?? props["@type"] ?? props.type;
  const osmId = props.osm_id ?? props["@id"];
  if (typeof osmType === "string" && (typeof osmId === "number" || typeof osmId === "string")) {
    const t = osmType.toLowerCase();
    if (t === "node" || t === "way" || t === "relation") {
      return `${t}/${osmId}`;
    }
  }
  return null;
}

export function osmiumFeatureToHuntly(feature: Feature): Feature | null {
  if (!feature.geometry) return null;
  const raw = (feature.properties ?? {}) as Record<string, unknown>;
  const id = stableOsmId(raw);
  if (!id) return null;

  const tags: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (PRESERVE.has(k) && v != null && v !== "") tags[k] = v;
  }
  const filtered = filterOsmProperties({ ...tags, id });
  return {
    type: "Feature",
    properties: { ...filtered, id } as OsmLikeProperties,
    geometry: feature.geometry as Geometry,
  };
}

export function osmiumCollectionToHuntly(fc: FeatureCollection): FeatureCollection {
  const features: Feature[] = [];
  for (const f of fc.features) {
    const mapped = osmiumFeatureToHuntly(f);
    if (mapped) features.push(mapped);
  }
  features.sort((a, b) => {
    const aid = String((a.properties as OsmLikeProperties).id);
    const bid = String((b.properties as OsmLikeProperties).id);
    return aid.localeCompare(bid);
  });
  return { type: "FeatureCollection", features };
}
