import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Pedometer } from "expo-sensors";
import { Alert, Platform } from "react-native";
import { syncActivityLiveSurface, endActivityLiveSurface } from "@/services/activityLiveSurfaceService";
import { ACTIVITY_LIVE_HUNTLY_GREEN } from "@/constants/activityLiveSurfaceColors";
import { TrackingPermissionError } from "@/utils/trackingLocationPermission";

export const TRACKING_LOCATION_TASK = "huntly-active-adventure-location";

export type TrackingActivityType = "walk" | "cycle";

export type TrackingRoutePoint = {
  latitude: number;
  longitude: number;
  timestamp?: number;
  accuracy?: number | null;
};

export type ActiveTrackingSession = {
  sessionId: string;
  type: TrackingActivityType;
  status: "active" | "completed";
  startedAt: string;
  endedAt: string | null;
  steps: number | null;
  distanceMeters: number;
  route: TrackingRoutePoint[];
  endedAtCoords: TrackingRoutePoint | null;
  selectedProfileIds?: number[];
  photoUris?: string[];
};

const ACTIVE_SESSION_KEY = "huntly.activeTrackingSession.v1";
const MIN_ROUTE_POINT_DISTANCE_METERS: Record<TrackingActivityType, number> = {
  walk: 5,
  cycle: 8,
};
const MAX_ROUTE_POINT_ACCURACY_METERS = 50;
const MAX_REASONABLE_SPEED_METERS_PER_SECOND: Record<TrackingActivityType, number> = {
  walk: 5.5,
  cycle: 18,
};
const ROUTE_START_SETTLE_MS = 15000;
const ROUTE_START_ANCHOR_REPLACE_METERS = 30;

let cachedSession: ActiveTrackingSession | null | undefined;
const listeners = new Set<(session: ActiveTrackingSession | null) => void>();

function createSessionId(type: TrackingActivityType) {
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatTrackingDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function metersBetween(a: TrackingRoutePoint, b: TrackingRoutePoint): number {
  const earthRadius = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * (sinDLon * sinDLon);
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isReliableRoutePoint(
  type: TrackingActivityType,
  last: TrackingRoutePoint | undefined,
  point: TrackingRoutePoint
) {
  if (point.accuracy != null && point.accuracy > MAX_ROUTE_POINT_ACCURACY_METERS) return false;
  if (!last) return true;

  if (last.timestamp != null && point.timestamp != null && point.timestamp <= last.timestamp) return false;

  const distance = metersBetween(last, point);
  if (last.timestamp != null && point.timestamp != null) {
    const elapsedSeconds = Math.max((point.timestamp - last.timestamp) / 1000, 0);
    if (elapsedSeconds > 0) {
      const speed = distance / elapsedSeconds;
      if (speed > MAX_REASONABLE_SPEED_METERS_PER_SECOND[type]) return false;
    }
  }

  return true;
}

function notify(session: ActiveTrackingSession | null) {
  listeners.forEach((listener) => listener(session));
}

function explainBackgroundTrackingPermission(): Promise<void> {
  return new Promise((resolve) => {
    Alert.alert(
      "Keep tracking your adventure",
      "Huntly World needs background location while a walk or cycle is active so your route keeps recording if you lock your phone or leave the app.",
      [{ text: "Continue", onPress: () => resolve() }]
    );
  });
}

export function subscribeActiveTrackingSession(listener: (session: ActiveTrackingSession | null) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getActiveTrackingSession(): Promise<ActiveTrackingSession | null> {
  if (cachedSession !== undefined) return cachedSession;
  const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
  cachedSession = raw ? (JSON.parse(raw) as ActiveTrackingSession) : null;
  return cachedSession;
}

export async function saveActiveTrackingSession(session: ActiveTrackingSession): Promise<ActiveTrackingSession> {
  cachedSession = session;
  await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  notify(session);
  void syncActivityLiveSurface(session);
  return session;
}

export async function updateActiveTrackingSession(
  patch: Partial<ActiveTrackingSession>
): Promise<ActiveTrackingSession | null> {
  const current = await getActiveTrackingSession();
  if (!current) return null;
  return saveActiveTrackingSession({ ...current, ...patch });
}

export async function refreshActiveTrackingLiveSurface(): Promise<ActiveTrackingSession | null> {
  const current = await getActiveTrackingSession();
  if (!current || current.status !== "active") return current;
  void syncActivityLiveSurface(current);
  return current;
}

export async function clearActiveTrackingSession(): Promise<void> {
  const current = await getActiveTrackingSession();
  await stopTrackingLocationUpdates();
  cachedSession = null;
  await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
  notify(null);
  if (current) void endActivityLiveSurface(current);
}

export async function ensureTrackingPermissions(): Promise<void> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new TrackingPermissionError("location_services_disabled");
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    throw new TrackingPermissionError("foreground_denied");
  }

  if (Platform.OS === "android") {
    await Notifications.requestPermissionsAsync();
  }

  const existingBackground = await Location.getBackgroundPermissionsAsync();
  if (existingBackground.status !== "granted") {
    await explainBackgroundTrackingPermission();
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") {
    throw new TrackingPermissionError("background_denied");
  }
}

async function getWalkStepsBetween(startedAt: string, endedAt: string): Promise<number | null> {
  try {
    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) return null;
    const result = await Pedometer.getStepCountAsync(new Date(startedAt), new Date(endedAt));
    return result.steps ?? null;
  } catch {
    return null;
  }
}

export async function refreshWalkStepsFromPedometer(): Promise<ActiveTrackingSession | null> {
  const current = await getActiveTrackingSession();
  if (!current || current.type !== "walk") return current;
  const steps = await getWalkStepsBetween(current.startedAt, current.endedAt ?? new Date().toISOString());
  if (steps == null) return current;
  return saveActiveTrackingSession({ ...current, steps: Math.max(current.steps ?? 0, steps) });
}

function trackingForegroundServiceCopy(type: TrackingActivityType): {
  notificationTitle: string;
  notificationBody: string;
  notificationColor: string;
} {
  const label = type === "cycle" ? "Cycle" : "Walk";
  return {
    notificationTitle: `Huntly World · ${label}`,
    // Expo Location only sets title/body when the foreground service starts (not on each GPS fix).
    // Live distance/time stay in the app and the iOS Live Activity when available.
    notificationBody: "Recording your GPS route. Open the app for live distance, time, and steps.",
    // Accent only on Android (see plugins/withAndroidLocationNotification.js); not a colorized background.
    notificationColor: ACTIVITY_LIVE_HUNTLY_GREEN,
  };
}

export async function startTrackingLocationUpdates(type: TrackingActivityType): Promise<void> {
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(TRACKING_LOCATION_TASK);
  if (alreadyStarted) return;
  const fg = trackingForegroundServiceCopy(type);

  await Location.startLocationUpdatesAsync(TRACKING_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    activityType: Location.ActivityType.Fitness,
    timeInterval: 2000,
    distanceInterval: MIN_ROUTE_POINT_DISTANCE_METERS[type],
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      ...fg,
      killServiceOnDestroy: false,
    },
  });
}

export async function stopTrackingLocationUpdates(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(TRACKING_LOCATION_TASK);
  if (started) await Location.stopLocationUpdatesAsync(TRACKING_LOCATION_TASK);
}

export async function startTrackingSession(type: TrackingActivityType): Promise<ActiveTrackingSession> {
  const existing = await getActiveTrackingSession();
  if (existing?.status === "active") return existing;

  await ensureTrackingPermissions();
  const now = new Date().toISOString();
  const session: ActiveTrackingSession = {
    sessionId: createSessionId(type),
    type,
    status: "active",
    startedAt: now,
    endedAt: null,
    steps: type === "walk" ? 0 : null,
    distanceMeters: 0,
    route: [],
    endedAtCoords: null,
    selectedProfileIds: [],
    photoUris: [],
  };

  await saveActiveTrackingSession(session);
  await startTrackingLocationUpdates(type);
  return session;
}

export async function appendTrackingLocation(point: TrackingRoutePoint): Promise<ActiveTrackingSession | null> {
  const current = await getActiveTrackingSession();
  if (!current || current.status !== "active") return current;

  const lastRoutePoint = current.route[current.route.length - 1];
  const lastKnownPoint = current.endedAtCoords ?? lastRoutePoint;
  if (!isReliableRoutePoint(current.type, lastKnownPoint, point)) {
    return current;
  }

  const distanceFromLast = lastRoutePoint ? metersBetween(lastRoutePoint, point) : 0;
  const sessionAgeMs = Date.now() - new Date(current.startedAt).getTime();
  if (
    lastRoutePoint &&
    current.route.length === 1 &&
    sessionAgeMs < ROUTE_START_SETTLE_MS &&
    distanceFromLast < ROUTE_START_ANCHOR_REPLACE_METERS
  ) {
    return saveActiveTrackingSession({
      ...current,
      route: [point],
      distanceMeters: 0,
      endedAtCoords: point,
    });
  }

  if (lastRoutePoint && distanceFromLast < MIN_ROUTE_POINT_DISTANCE_METERS[current.type]) {
    return saveActiveTrackingSession({ ...current, endedAtCoords: point });
  }

  const nextDistance = lastRoutePoint ? current.distanceMeters + distanceFromLast : current.distanceMeters;
  return saveActiveTrackingSession({
    ...current,
    route: current.route.concat(point),
    distanceMeters: nextDistance,
    endedAtCoords: point,
  });
}

export async function completeTrackingSession(): Promise<ActiveTrackingSession | null> {
  const current = await getActiveTrackingSession();
  if (!current) return null;
  const endedAt = new Date().toISOString();
  const recoveredSteps =
    current.type === "walk" ? await getWalkStepsBetween(current.startedAt, endedAt) : current.steps;
  const completedSteps =
    current.type === "walk" && recoveredSteps != null ? Math.max(current.steps ?? 0, recoveredSteps) : current.steps;
  const completed = await saveActiveTrackingSession({
    ...current,
    status: "completed",
    endedAt,
    steps: completedSteps,
  });
  await stopTrackingLocationUpdates();
  void endActivityLiveSurface(completed);
  return completed;
}

export async function addTrackingPhotoUri(uri: string): Promise<ActiveTrackingSession | null> {
  if (!uri) return getActiveTrackingSession();
  const current = await getActiveTrackingSession();
  if (!current) return null;
  const photoUris = current.photoUris ?? [];
  if (photoUris.includes(uri)) return current;
  return saveActiveTrackingSession({ ...current, photoUris: photoUris.concat(uri) });
}
