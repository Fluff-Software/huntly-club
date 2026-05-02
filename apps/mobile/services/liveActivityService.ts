/**
 * Thin wrapper around the expo-live-activity native module.
 *
 * Manages a single active Live Activity per session (walk or cycle).
 * Updates are throttled so we don't hammer ActivityKit every second.
 */

import {
  isLiveActivitySupported,
  startLiveActivity,
  updateLiveActivity,
  endLiveActivity,
  LiveActivityType,
} from "../modules/expo-live-activity";

// Minimum distance change (m) or seconds between forced updates before we
// bother pushing a stat refresh to the Live Activity.
const UPDATE_DISTANCE_THRESHOLD_M = 15;
const UPDATE_INTERVAL_MS = 30_000;

let currentActivityId: string | null = null;
let lastUpdateMs = 0;
let lastDistanceMeters = 0;

export function isLiveActivityAvailable(): boolean {
  return isLiveActivitySupported();
}

export async function startSessionLiveActivity(
  type: LiveActivityType,
  distanceMeters: number,
  steps?: number
): Promise<void> {
  if (!isLiveActivitySupported()) return;

  // End any stale activity from a previous session
  await endSessionLiveActivity(distanceMeters, steps);

  const id = await startLiveActivity(type, { distanceMeters, steps });
  currentActivityId = id;
  lastUpdateMs = Date.now();
  lastDistanceMeters = distanceMeters;
}

/**
 * Call this on every location/step update.
 * Updates are sent only when enough distance has been covered or enough time
 * has elapsed to avoid unnecessary ActivityKit round-trips.
 */
export async function maybeUpdateSessionLiveActivity(
  distanceMeters: number,
  steps?: number
): Promise<void> {
  if (!currentActivityId) return;

  const now = Date.now();
  const distanceDelta = Math.abs(distanceMeters - lastDistanceMeters);
  const timeDelta = now - lastUpdateMs;

  if (
    distanceDelta < UPDATE_DISTANCE_THRESHOLD_M &&
    timeDelta < UPDATE_INTERVAL_MS
  ) {
    return;
  }

  await updateLiveActivity(currentActivityId, { distanceMeters, steps });
  lastUpdateMs = now;
  lastDistanceMeters = distanceMeters;
}

export async function endSessionLiveActivity(
  distanceMeters: number,
  steps?: number
): Promise<void> {
  if (!currentActivityId) return;

  const id = currentActivityId;
  currentActivityId = null;
  lastUpdateMs = 0;
  lastDistanceMeters = 0;

  await endLiveActivity(id, { distanceMeters, steps });
}
