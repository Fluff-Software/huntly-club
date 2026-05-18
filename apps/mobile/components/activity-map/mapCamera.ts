import type { InitialViewState, LngLatBounds } from "@maplibre/maplibre-react-native";
import { latitudeDeltaToZoom, routeToLngLatBounds, zoomToLatitudeDelta } from "./region";
import {
  ACTIVITY_MAP_ROUTE_FIT_PADDING,
  type ActivityCoordinate,
  type ActivityMapRegion,
} from "./types";

export function regionToLngLatBounds(region: ActivityMapRegion): LngLatBounds {
  const halfLat = region.latitudeDelta / 2;
  const halfLon = region.longitudeDelta / 2;
  return [
    region.longitude - halfLon,
    region.latitude - halfLat,
    region.longitude + halfLon,
    region.latitude + halfLat,
  ];
}

export function viewStateToActivityRegion(
  center: [number, number],
  zoom: number,
  bounds?: LngLatBounds
): ActivityMapRegion {
  const latitude = center[1];
  const longitude = center[0];
  if (bounds) {
    const [west, south, east, north] = bounds;
    return {
      latitude,
      longitude,
      latitudeDelta: Math.max(north - south, 0.0001),
      longitudeDelta: Math.max(east - west, 0.0001),
    };
  }
  const latitudeDelta = zoomToLatitudeDelta(zoom, latitude);
  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta: latitudeDelta,
  };
}

export function buildInitialViewState(
  initialRegion: ActivityMapRegion,
  route: ActivityCoordinate[],
  fitRoute: boolean
): InitialViewState {
  if (fitRoute) {
    const bounds = routeToLngLatBounds(route);
    if (bounds) {
      return {
        bounds,
        padding: {
          top: ACTIVITY_MAP_ROUTE_FIT_PADDING,
          right: ACTIVITY_MAP_ROUTE_FIT_PADDING,
          bottom: ACTIVITY_MAP_ROUTE_FIT_PADDING,
          left: ACTIVITY_MAP_ROUTE_FIT_PADDING,
        },
        bearing: 0,
        pitch: 0,
      };
    }
  }

  return {
    center: [initialRegion.longitude, initialRegion.latitude],
    zoom: latitudeDeltaToZoom(initialRegion.latitudeDelta, initialRegion.latitude),
    bearing: 0,
    pitch: 0,
  };
}

export function buildRecenterCameraStop(
  options: {
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  },
  fallbackZoom: number
) {
  const latitudeDelta =
    options.latitudeDelta ??
    options.longitudeDelta ??
    zoomToLatitudeDelta(fallbackZoom, options.latitude);

  return {
    center: [options.longitude, options.latitude] as [number, number],
    zoom: latitudeDeltaToZoom(latitudeDelta, options.latitude),
    bearing: 0,
    pitch: 0,
  };
}
