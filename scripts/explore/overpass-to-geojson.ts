/**
 * Convert Overpass JSON (out body geom) into the Explore GeoJSON FeatureCollection format.
 * Preserves stable OSM IDs and the tag set used by the stop generator.
 */
import type { Feature, FeatureCollection, Position } from "geojson";
import type { OsmLikeProperties } from "./types.js";

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
  members?: Array<{
    type: string;
    ref: number;
    role: string;
    geometry?: Array<{ lat: number; lon: number }>;
  }>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

const PRESERVE_TAGS = [
  "highway",
  "footway",
  "sidewalk",
  "foot",
  "bicycle",
  "access",
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
] as const;

function pickProps(el: OverpassElement): OsmLikeProperties {
  const id = `${el.type}/${el.id}`;
  const props: OsmLikeProperties = { id };
  const tags = el.tags ?? {};
  for (const key of PRESERVE_TAGS) {
    if (tags[key] != null) props[key] = tags[key];
  }
  // Keep raw access-related variants commonly used in OSM.
  if (tags["access:foot"]) props["access:foot"] = tags["access:foot"];
  if (tags["foot:signed"]) props["foot:signed"] = tags["foot:signed"];
  return props;
}

function ringFromGeom(geom: Array<{ lat: number; lon: number }>): Position[] {
  const coords = geom.map((g) => [g.lon, g.lat] as Position);
  if (coords.length >= 3) {
    const first = coords[0]!;
    const last = coords[coords.length - 1]!;
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push([...first]);
    }
  }
  return coords;
}

function wayToFeature(el: OverpassElement): Feature | null {
  if (!el.geometry || el.geometry.length < 2) return null;
  const props = pickProps(el);
  const tags = el.tags ?? {};
  const closed =
    el.geometry.length >= 4 &&
    el.geometry[0]!.lat === el.geometry[el.geometry.length - 1]!.lat &&
    el.geometry[0]!.lon === el.geometry[el.geometry.length - 1]!.lon;

  const areaLike =
    closed &&
    (tags.area === "yes" ||
      tags.leisure != null ||
      tags.landuse != null ||
      tags.natural != null ||
      tags.building != null ||
      tags.amenity != null ||
      tags.highway === "pedestrian" ||
      tags.place === "square");

  if (areaLike) {
    const ring = ringFromGeom(el.geometry);
    if (ring.length < 4) return null;
    return {
      type: "Feature",
      properties: props,
      geometry: { type: "Polygon", coordinates: [ring] },
    };
  }

  return {
    type: "Feature",
    properties: props,
    geometry: {
      type: "LineString",
      coordinates: el.geometry.map((g) => [g.lon, g.lat]),
    },
  };
}

function nodeToFeature(el: OverpassElement): Feature | null {
  if (el.lat == null || el.lon == null) return null;
  return {
    type: "Feature",
    properties: pickProps(el),
    geometry: { type: "Point", coordinates: [el.lon, el.lat] },
  };
}

function relationToFeature(el: OverpassElement): Feature | null {
  const tags = el.tags ?? {};
  if (!el.members?.length) return null;
  const outers = el.members.filter((m) => m.role === "outer" && m.geometry && m.geometry.length >= 4);
  if (outers.length === 0) return null;
  const coordinates = outers.map((m) => ringFromGeom(m.geometry!));
  // Multipolygon if several outers; otherwise polygon.
  if (coordinates.length === 1) {
    return {
      type: "Feature",
      properties: pickProps(el),
      geometry: { type: "Polygon", coordinates: [coordinates[0]!] },
    };
  }
  return {
    type: "Feature",
    properties: pickProps(el),
    geometry: {
      type: "MultiPolygon",
      coordinates: coordinates.map((ring) => [ring]),
    },
  };
  void tags;
}

export function overpassToGeoJson(data: OverpassResponse): FeatureCollection {
  const features: Feature[] = [];
  for (const el of data.elements ?? []) {
    let feature: Feature | null = null;
    if (el.type === "way") feature = wayToFeature(el);
    else if (el.type === "node") feature = nodeToFeature(el);
    else if (el.type === "relation") feature = relationToFeature(el);
    if (feature) features.push(feature);
  }
  // Stable order by id
  features.sort((a, b) => {
    const aid = String((a.properties as OsmLikeProperties).id);
    const bid = String((b.properties as OsmLikeProperties).id);
    return aid < bid ? -1 : aid > bid ? 1 : 0;
  });
  return { type: "FeatureCollection", features };
}

export function buildOverpassQuery(bbox: {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
}): string {
  // Overpass bbox: south,west,north,east
  const bb = `${bbox.minLatitude},${bbox.minLongitude},${bbox.maxLatitude},${bbox.maxLongitude}`;
  return `
[out:json][timeout:180];
(
  way(${bb})["highway"];
  way(${bb})["leisure"];
  way(${bb})["landuse"];
  way(${bb})["natural"];
  way(${bb})["waterway"];
  way(${bb})["railway"];
  way(${bb})["building"];
  way(${bb})["barrier"];
  way(${bb})["amenity"];
  way(${bb})["shop"];
  way(${bb})["entrance"];
  node(${bb})["entrance"];
  node(${bb})["amenity"];
  node(${bb})["shop"];
  node(${bb})["barrier"];
  relation(${bb})["leisure"];
  relation(${bb})["landuse"];
  relation(${bb})["natural"];
);
out body geom;
`.trim();
}
