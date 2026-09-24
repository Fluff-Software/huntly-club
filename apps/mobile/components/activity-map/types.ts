import type { StyleProp, ViewStyle } from "react-native";

export const ACTIVITY_ROUTE_STROKE_COLOR = "#2D5A27";
export const ACTIVITY_MAP_DEFAULT_DELTA = 0.01;
export const ACTIVITY_MAP_RECENTER_DURATION_MS = 350;
/** Pixel inset when fitting the camera to a route (journal previews, etc.). */
export const ACTIVITY_MAP_ROUTE_FIT_PADDING = 28;

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

export type ActivityMapMarkerIcon = "lock" | "check" | "pin";

export type ActivityMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  /** Hex colour for the pin / circle. */
  color?: string;
  title?: string;
  /** Visual variant — `user` is distinct from stop pins. */
  variant?: "stop" | "user";
  /**
   * Optional glyph for stop markers.
   * `lock` = not yet collected, `check` = already collected.
   */
  icon?: ActivityMapMarkerIcon;
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
  /** When true and route has 2+ points, camera uses geographic bounds instead of center + delta. */
  fitRoute?: boolean;
  /**
   * Minimum map zoom (more zoomed out = lower number).
   * Use to cap how far the user can zoom out.
   */
  minZoomLevel?: number;
  /** Maximum map zoom (more zoomed in = higher number). */
  maxZoomLevel?: number;
  onRegionChange?: (region: ActivityMapRegion) => void;
  /** Optional point markers (Explore debug / POI overlays). */
  markers?: ActivityMapMarker[];
  onMarkerPress?: (markerId: string) => void;
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
