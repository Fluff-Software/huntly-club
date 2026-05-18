import { ACTIVITY_MAP_DEFAULT_DELTA } from "./types";
import type { ActivityCoordinate, ActivityMapRegion } from "./types";

/** Fit a route with padding (used by journal preview maps). */
export function regionForRoute(route: ActivityCoordinate[]): ActivityMapRegion | null {
  if (route.length === 0) return null;
  let minLat = route[0]!.latitude;
  let maxLat = route[0]!.latitude;
  let minLon = route[0]!.longitude;
  let maxLon = route[0]!.longitude;
  for (const p of route) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLon) minLon = p.longitude;
    if (p.longitude > maxLon) maxLon = p.longitude;
  }
  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLon + maxLon) / 2;
  const latDeltaRaw = Math.max(0.001, maxLat - minLat);
  const lonDeltaRaw = Math.max(0.001, maxLon - minLon);
  const padding = 1.6;
  return {
    latitude,
    longitude,
    latitudeDelta: Math.max(ACTIVITY_MAP_DEFAULT_DELTA, latDeltaRaw * padding),
    longitudeDelta: Math.max(ACTIVITY_MAP_DEFAULT_DELTA, lonDeltaRaw * padding),
  };
}

export function regionFromCoordinate(
  coordinate: ActivityCoordinate,
  delta: number = ACTIVITY_MAP_DEFAULT_DELTA
): ActivityMapRegion {
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

/** Approximate MapLibre zoom from react-native-maps latitude delta. */
export function latitudeDeltaToZoom(latitudeDelta: number, latitude?: number): number {
  const delta = Math.max(latitudeDelta, 0.0001);
  const cosLat =
    latitude === undefined ? 1 : Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
  return Math.log2((360 * cosLat) / delta);
}

export function zoomToLatitudeDelta(zoom: number, latitude?: number): number {
  const cosLat =
    latitude === undefined ? 1 : Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
  return (360 * cosLat) / Math.pow(2, zoom);
}

/** Geographic bounds as [west, south, east, north] for MapLibre Camera.fitBounds. */
export function routeToLngLatBounds(route: ActivityCoordinate[]): [number, number, number, number] | null {
  if (route.length === 0) return null;
  let minLat = route[0]!.latitude;
  let maxLat = route[0]!.latitude;
  let minLon = route[0]!.longitude;
  let maxLon = route[0]!.longitude;
  for (const p of route) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLon) minLon = p.longitude;
    if (p.longitude > maxLon) maxLon = p.longitude;
  }
  return [minLon, minLat, maxLon, maxLat];
}
