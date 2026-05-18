import type { StyleProp, ViewStyle } from "react-native";

export const ACTIVITY_ROUTE_STROKE_COLOR = "#2D5A27";
export const ACTIVITY_MAP_DEFAULT_DELTA = 0.01;
export const ACTIVITY_MAP_RECENTER_DURATION_MS = 350;

export type ActivityCoordinate = {
  latitude: number;
  longitude: number;
};

export type ActivityMapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type ActivityMapProps = {
  style?: StyleProp<ViewStyle>;
  route: ActivityCoordinate[];
  initialRegion: ActivityMapRegion;
  showUserLocation?: boolean;
  routeStrokeWidth?: number;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  rotateEnabled?: boolean;
  pitchEnabled?: boolean;
  pointerEvents?: "box-none" | "none" | "box-only" | "auto";
  onRegionChange?: (region: ActivityMapRegion) => void;
};

export type ActivityMapRecenterOptions = {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
};

export type ActivityMapRef = {
  recenter: (options: ActivityMapRecenterOptions) => void;
};
