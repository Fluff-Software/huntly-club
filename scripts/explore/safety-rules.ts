import * as turf from "@turf/turf";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson";
import type {
  GeneratorConfig,
  LatLon,
  OsmLikeProperties,
  RejectionReason,
  SourceFeatureType,
} from "./types.js";
import {
  FeatureSpatialIndex,
  featuresForPoint,
  type SafetyLookup,
} from "./national/spatial-index.js";
import { profileTime } from "./national/profile.js";

export type ClassifiedFeature = {
  id: string;
  sourceType: SourceFeatureType | null;
  role: "source" | "hazard" | "environment";
  props: OsmLikeProperties;
  feature: Feature;
};

function propsOf(feature: Feature): OsmLikeProperties {
  const p = (feature.properties ?? {}) as OsmLikeProperties;
  if (!p.id) {
    throw new Error("Every feature requires properties.id (OSM-style stable id)");
  }
  return p;
}

/** Road classes that must never become stop sources (carriageway centres). */
export function isCarriagewayHighway(props: OsmLikeProperties): boolean {
  const h = props.highway;
  if (!h) return false;
  return [
    "motorway",
    "motorway_link",
    "trunk",
    "trunk_link",
    "primary",
    "primary_link",
    "secondary",
    "secondary_link",
    "tertiary",
    "tertiary_link",
    "residential",
    "living_street",
    "unclassified",
    "service",
    "road",
  ].includes(h);
}

/**
 * Residential / living street / unclassified without a dedicated pedestrian geometry.
 * These must not emit stop candidates (road-centre risk).
 */
export function isResidentialWithoutSafePedestrian(props: OsmLikeProperties): boolean {
  const h = props.highway;
  if (h !== "residential" && h !== "living_street" && h !== "unclassified") return false;
  // Even with sidewalk=* tags on the roadway, we refuse centreline candidates.
  // Safe standing positions come from separate footway/sidewalk features.
  return true;
}

export function classifySourceType(props: OsmLikeProperties): SourceFeatureType | null {
  if (props.explore_source) return props.explore_source;

  if (props.access === "private" || props.access === "no") return null;

  // Never place stops on vehicle carriageways.
  if (isCarriagewayHighway(props)) return null;

  if (props.leisure === "park") return "park";
  if (props.leisure === "garden" && props.access !== "private") return "garden";
  if (props.leisure === "recreation_ground") return "recreation_ground";
  if (props.leisure === "common") return "common";
  if (props.highway === "pedestrian" || props.place === "square") return "plaza";
  if (props.highway === "footway" && props.footway === "sidewalk") return "sidewalk";
  if (props.highway === "footway") return "footpath";
  if (props.highway === "path") return "path";
  if (props.highway === "cycleway" && (props.foot === "yes" || props.foot === "designated")) {
    return "cycleway_walk";
  }
  if (props.landuse === "recreation_ground") return "recreation_ground";

  // High-confidence public venues (point or polygon) — standing at mapped entrance preferred later;
  // for now only accept as source when explicitly explore_source=venue in fixtures.
  if (
    props.amenity === "library" ||
    props.amenity === "community_centre" ||
    props.amenity === "museum" ||
    props.tourism === "attraction"
  ) {
    // Deferred as automatic sources — treat as environment/urban context only.
    return null;
  }

  return null;
}

export function isHazardFeature(props: OsmLikeProperties): boolean {
  if (props.explore_role === "hazard") return true;
  if (props.access === "private" || props.access === "no") return true;
  if (props.natural === "water" || props.waterway || props.natural === "wetland") return true;
  if (props.building && props.building !== "no") return true;
  if (props.railway && props.railway !== "abandoned") return true;
  if (props.barrier && props.barrier !== "no") return true;
  if (props.highway === "motorway" || props.highway === "motorway_link") return true;
  if (props.highway === "trunk" || props.highway === "trunk_link") return true;
  if (props.highway === "primary" || props.highway === "primary_link") return true;
  if (
    props.amenity === "school" ||
    props.amenity === "college" ||
    props.amenity === "university" ||
    props.amenity === "kindergarten" ||
    props.landuse === "education" ||
    props.building === "school"
  ) {
    return true;
  }
  if (props.leisure === "garden" && props.access === "private") return true;
  if (props.landuse === "residential" && props.access === "private") return true;
  return false;
}

export function isEnvironmentFeature(props: OsmLikeProperties): boolean {
  if (props.explore_role === "environment") return true;
  if (props.natural === "wood" || props.landuse === "forest") return true;
  if (props.landuse === "grass" || props.landuse === "meadow") return true;
  if (props.landuse === "farmland" || props.landuse === "farmyard") return true;
  if (props.natural === "water" || props.natural === "wetland" || props.waterway) return true;
  if (props.building || props.shop || props.amenity) return true;
  if (props.highway && !["footway", "path", "pedestrian", "cycleway", "steps"].includes(props.highway)) {
    return true;
  }
  return false;
}

export function isWaterProps(props: OsmLikeProperties): boolean {
  return Boolean(
    props.natural === "water" ||
      props.natural === "wetland" ||
      props.waterway ||
      props.landuse === "basin" ||
      props.landuse === "reservoir"
  );
}

export function isMajorRoadProps(props: OsmLikeProperties): boolean {
  const h = props.highway;
  return (
    h === "motorway" ||
    h === "motorway_link" ||
    h === "trunk" ||
    h === "trunk_link" ||
    h === "primary" ||
    h === "primary_link"
  );
}

export function loadAndClassify(collection: FeatureCollection): ClassifiedFeature[] {
  return collection.features.map((feature) => {
    const props = propsOf(feature);
    const role =
      props.explore_role ??
      (isHazardFeature(props)
        ? "hazard"
        : classifySourceType(props)
          ? "source"
          : isEnvironmentFeature(props)
            ? "environment"
            : "hazard");
    const sourceType = role === "source" ? classifySourceType(props) : null;
    return {
      id: props.id,
      sourceType,
      role,
      props,
      feature,
    };
  });
}

export function pointInBbox(point: LatLon, config: GeneratorConfig): boolean {
  return (
    point.latitude >= config.minLatitude &&
    point.latitude <= config.maxLatitude &&
    point.longitude >= config.minLongitude &&
    point.longitude <= config.maxLongitude
  );
}

function lineCoords(geometry: LineString | MultiLineString): Position[][] {
  if (geometry.type === "LineString") return [geometry.coordinates];
  return geometry.coordinates;
}

function polygonGeoms(geometry: Polygon | MultiPolygon): Polygon[] {
  if (geometry.type === "Polygon") return [geometry];
  return geometry.coordinates.map((coords) => ({
    type: "Polygon",
    coordinates: coords,
  }));
}

export function distanceToFeatureMeters(point: LatLon, feature: Feature): number {
  const pt = turf.point([point.longitude, point.latitude]);
  const geom = feature.geometry;
  if (!geom) return Number.POSITIVE_INFINITY;

  if (geom.type === "Point") {
    return turf.distance(pt, feature as Feature<GeoJSON.Point>, { units: "meters" });
  }
  if (geom.type === "LineString" || geom.type === "MultiLineString") {
    const nearest = turf.nearestPointOnLine(feature as Feature<LineString | MultiLineString>, pt, {
      units: "meters",
    });
    return nearest.properties.dist ?? Number.POSITIVE_INFINITY;
  }
  if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
    if (turf.booleanPointInPolygon(pt, feature as Feature<Polygon | MultiPolygon>)) {
      return 0;
    }
    const ring = turf.polygonToLine(feature as Feature<Polygon | MultiPolygon>);
    if (ring.type === "FeatureCollection") {
      let min = Number.POSITIVE_INFINITY;
      for (const f of ring.features) {
        const nearest = turf.nearestPointOnLine(f as Feature<LineString>, pt, { units: "meters" });
        min = Math.min(min, nearest.properties.dist ?? Number.POSITIVE_INFINITY);
      }
      return min;
    }
    const nearest = turf.nearestPointOnLine(ring as Feature<LineString>, pt, { units: "meters" });
    return nearest.properties.dist ?? Number.POSITIVE_INFINITY;
  }
  return Number.POSITIVE_INFINITY;
}

function isMotorway(props: OsmLikeProperties): boolean {
  return props.highway === "motorway" || props.highway === "motorway_link";
}

function isTrunk(props: OsmLikeProperties): boolean {
  return props.highway === "trunk" || props.highway === "trunk_link";
}

function isPrimary(props: OsmLikeProperties): boolean {
  return props.highway === "primary" || props.highway === "primary_link";
}

function isRailway(props: OsmLikeProperties): boolean {
  return Boolean(props.railway && props.railway !== "abandoned");
}

function isBuilding(props: OsmLikeProperties): boolean {
  return Boolean(props.building && props.building !== "no");
}

function isPrivateAccess(props: OsmLikeProperties): boolean {
  return props.access === "private" || props.access === "no";
}

function isPrivateGarden(props: OsmLikeProperties): boolean {
  return props.leisure === "garden" && isPrivateAccess(props);
}

function isBarrier(props: OsmLikeProperties): boolean {
  return Boolean(props.barrier && props.barrier !== "no" && props.barrier !== "kerb");
}

function isHardBarrier(props: OsmLikeProperties): boolean {
  const b = props.barrier;
  return b === "fence" || b === "wall" || b === "hedge" || b === "retaining_wall";
}

/**
 * Evaluate safety for a candidate position against hazard layers.
 * Returns null when safe, otherwise a rejection reason.
 *
 * When `lookup.index` is provided, only nearby indexed features are examined;
 * exact Turf distance checks are unchanged.
 */
export function evaluateSafety(
  point: LatLon,
  config: GeneratorConfig,
  classified: ClassifiedFeature[],
  options?: {
    sourceFeatureId?: string;
    requireInsideSourceId?: string;
    index?: FeatureSpatialIndex | null;
  }
): RejectionReason | null {
  return profileTime("safety_evaluate_ms", () => {
    if (!pointInBbox(point, config)) return "outside_test_area";

    const pt = turf.point([point.longitude, point.latitude]);
    const lookup: SafetyLookup = { classified, index: options?.index };

    if (options?.requireInsideSourceId) {
      const source =
        options.index?.byId.get(options.requireInsideSourceId) ??
        classified.find((c) => c.id === options.requireInsideSourceId);
      if (
        source &&
        source.feature.geometry &&
        (source.feature.geometry.type === "Polygon" ||
          source.feature.geometry.type === "MultiPolygon")
      ) {
        if (!turf.booleanPointInPolygon(pt, source.feature as Feature<Polygon | MultiPolygon>)) {
          return "outside_source_area";
        }
      }
    }

    const nearby = featuresForPoint(point, config, lookup);
    for (const item of nearby) {
      if (item.role === "source" && item.id === options?.sourceFeatureId) {
        continue;
      }

      const { props, feature } = item;
      const dist = distanceToFeatureMeters(point, feature);

      if (isWaterProps(props)) {
        // Only reject standing *in* water here. Paths beside ponds/canals are
        // handled in evaluateSafetyContext (flag + confidence, not hard reject).
        if (dist === 0) return "inside_water";
      }

      if (isBuilding(props) && dist === 0) return "inside_building";

      if (isMotorway(props)) {
        if (dist === 0) return "on_motorway";
        if (dist < config.motorwayBufferMeters) return "too_close_to_motorway";
      }

      if (isTrunk(props)) {
        if (dist === 0) return "on_trunk_road";
        if (dist < config.trunkBufferMeters) return "too_close_to_trunk_road";
      }

      if (isPrimary(props)) {
        if (dist === 0) return "on_primary_road";
        if (dist < config.primaryBufferMeters) return "too_close_to_primary_road";
      }

      if (isRailway(props)) {
        if (dist === 0) return "on_railway";
        if (dist < config.railwayBufferMeters) return "too_close_to_railway";
      }

      if (isHardBarrier(props) && dist < config.barrierBufferMeters) {
        return "too_close_to_barrier";
      }

      if (isPrivateGarden(props) && dist === 0) return "inside_private_garden";

      // Gates / barrier nodes with access tags are handled in evaluateSafetyContext
      // (public pedestrian gates must not hard-fail here).
      if (
        isPrivateAccess(props) &&
        dist === 0 &&
        item.role === "hazard" &&
        !isBarrier(props)
      ) {
        return "private_access";
      }
    }

    return null;
  });
}

export function haversineMeters(a: LatLon, b: LatLon): number {
  return turf.distance(
    turf.point([a.longitude, a.latitude]),
    turf.point([b.longitude, b.latitude]),
    { units: "meters" }
  );
}

export function minDistanceToMatching(
  point: LatLon,
  classified: ClassifiedFeature[],
  match: (props: OsmLikeProperties) => boolean,
  index?: FeatureSpatialIndex | null,
  config?: GeneratorConfig
): number {
  const lookup: SafetyLookup = { classified, index };
  const scan =
    index && config
      ? featuresForPoint(point, config, lookup)
      : classified;
  let min = Number.POSITIVE_INFINITY;
  for (const item of scan) {
    if (!match(item.props)) continue;
    min = Math.min(min, distanceToFeatureMeters(point, item.feature));
  }
  return min;
}

export { lineCoords, polygonGeoms };
