import * as turf from "npm:@turf/turf@7.3.5";
import type { Feature, Polygon, MultiPolygon } from "npm:@types/geojson@7946.0.16";
import type { ClassifiedFeature } from "./safety-rules.ts";
import type { EnvironmentKey, EnvironmentProfile, GeneratorConfig, LatLon } from "./types.ts";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function distanceMeters(point: LatLon, feature: Feature): number {
  const pt = turf.point([point.longitude, point.latitude]);
  const geom = feature.geometry;
  if (!geom) return Number.POSITIVE_INFINITY;
  if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
    if (turf.booleanPointInPolygon(pt, feature as Feature<Polygon | MultiPolygon>)) return 0;
  }
  try {
    if (geom.type === "Point") {
      return turf.distance(pt, feature as Feature<GeoJSON.Point>, { units: "meters" });
    }
    if (geom.type === "LineString" || geom.type === "MultiLineString") {
      return (
        turf.nearestPointOnLine(feature as Feature<GeoJSON.LineString>, pt, { units: "meters" })
          .properties.dist ?? Number.POSITIVE_INFINITY
      );
    }
    if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
      const ring = turf.polygonToLine(feature as Feature<Polygon | MultiPolygon>);
      if (ring.type === "FeatureCollection") {
        let min = Number.POSITIVE_INFINITY;
        for (const f of ring.features) {
          const d =
            turf.nearestPointOnLine(f as Feature<GeoJSON.LineString>, pt, { units: "meters" })
              .properties.dist ?? Number.POSITIVE_INFINITY;
          min = Math.min(min, d);
        }
        return min;
      }
      return (
        turf.nearestPointOnLine(ring as Feature<GeoJSON.LineString>, pt, { units: "meters" })
          .properties.dist ?? Number.POSITIVE_INFINITY
      );
    }
  } catch {
    return Number.POSITIVE_INFINITY;
  }
  return Number.POSITIVE_INFINITY;
}

function bump(scores: Record<EnvironmentKey, number>, key: EnvironmentKey, amount: number) {
  scores[key] = clamp01((scores[key] ?? 0) + amount);
}

/**
 * Deterministic environment scores from nearby map features.
 * Heuristic only — good enough for card-weight prototyping later.
 */
export function scoreEnvironment(
  point: LatLon,
  config: GeneratorConfig,
  classified: ClassifiedFeature[],
  sourceType: string
): EnvironmentProfile {
  const scores: Record<EnvironmentKey, number> = {
    freshwater: 0,
    wetland: 0,
    woodland: 0,
    grassland: 0,
    farmland: 0,
    urban: 0,
    park_garden: 0,
    general: 0,
  };

  const radius = config.environmentRadiusMeters;

  if (
    sourceType === "park" ||
    sourceType === "garden" ||
    sourceType === "recreation_ground" ||
    sourceType === "common"
  ) {
    bump(scores, "park_garden", 0.7);
  }

  for (const item of classified) {
    const dist = distanceMeters(point, item.feature);
    if (dist > radius) continue;
    const proximity = 1 - dist / radius;
    const props = item.props;

    if (props.natural === "water" || props.waterway || props.landuse === "basin") {
      bump(scores, "freshwater", 0.55 * proximity + (dist === 0 ? 0.3 : 0));
    }
    if (props.natural === "wetland") {
      bump(scores, "wetland", 0.7 * proximity);
    }
    if (props.natural === "wood" || props.landuse === "forest") {
      bump(scores, "woodland", 0.65 * proximity);
    }
    if (props.landuse === "grass" || props.landuse === "meadow") {
      bump(scores, "grassland", 0.55 * proximity);
    }
    if (props.landuse === "farmland" || props.landuse === "farmyard") {
      bump(scores, "farmland", 0.6 * proximity);
    }
    if (
      props.building ||
      props.shop ||
      props.amenity === "library" ||
      props.amenity === "cafe" ||
      (props.highway &&
        ["residential", "service", "tertiary", "secondary", "primary"].includes(props.highway))
    ) {
      bump(scores, "urban", 0.35 * proximity);
    }
    if (props.leisure === "park" || props.leisure === "garden") {
      bump(scores, "park_garden", 0.4 * proximity);
    }
  }

  const meaningful = (Object.entries(scores) as [EnvironmentKey, number][]).filter(
    ([k, v]) => k !== "general" && v > 0.05
  );

  if (meaningful.length === 0) {
    return { general: 1 };
  }

  const profile: EnvironmentProfile = {};
  for (const [key, value] of meaningful) {
    profile[key] = Math.round(value * 1000) / 1000;
  }
  return profile;
}

export function mainEnvironment(profile: EnvironmentProfile): string {
  let bestKey = "general";
  let best = -1;
  for (const [key, value] of Object.entries(profile)) {
    if (typeof value === "number" && value > best) {
      best = value;
      bestKey = key;
    }
  }
  return bestKey;
}
