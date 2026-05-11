import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Pedometer } from "expo-sensors";
import { Alert, Platform } from "react-native";
import { syncActivityLiveSurface, endActivityLiveSurface } from "@/services/activityLiveSurfaceService";

export const TRACKING_LOCATION_TASK = "huntly-active-adventure-location";

export type TrackingActivityType = "walk" | "cycle";

export type TrackingRoutePoint = {
  latitude: number;
  longitude: number;
  timestamp?: number;
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
const MIN_ROUTE_POINT_DISTANCE_METERS = 2;

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

export async function clearActiveTrackingSession(): Promise<void> {
  const current = await getActiveTrackingSession();
  cachedSession = null;
  await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
  notify(null);
  if (current) void endActivityLiveSurface(current);
}

export async function ensureTrackingPermissions(): Promise<void> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    throw new Error("Location permission is needed to track your adventure.");
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
    throw new Error("Background location permission is needed to keep tracking while the app is closed.");
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
  return saveActiveTrackingSession({ ...current, steps });
}

export async function startTrackingLocationUpdates(type: TrackingActivityType): Promise<void> {
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(TRACKING_LOCATION_TASK);
  if (alreadyStarted) return;
  const title = type === "cycle" ? "Cycle in progress" : "Walk in progress";

  await Location.startLocationUpdatesAsync(TRACKING_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    activityType: Location.ActivityType.Fitness,
    timeInterval: 2000,
    distanceInterval: 3,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: title,
      notificationBody: "Huntly World is recording your route.",
      notificationColor: "#4F6F52",
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

  const last = current.route[current.route.length - 1];
  if (last && metersBetween(last, point) < MIN_ROUTE_POINT_DISTANCE_METERS) {
    return saveActiveTrackingSession({ ...current, endedAtCoords: point });
  }

  const nextDistance = last ? current.distanceMeters + metersBetween(last, point) : current.distanceMeters;
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
  const completed = await saveActiveTrackingSession({
    ...current,
    status: "completed",
    endedAt,
    steps: recoveredSteps ?? current.steps,
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
