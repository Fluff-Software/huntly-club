import * as Location from "expo-location";
import { TrackingPermissionError } from "@/utils/trackingLocationPermission";

export type ExploreLocationFix = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

/**
 * Foreground-only location for World Exploration. Deliberately not built on top of
 * trackingSessionService.ts, which is entangled with background expo-task-manager and
 * Pedometer machinery this feature doesn't need. Never requests background permission --
 * that's the point: no continuous route is ever synced, only a live position while this
 * screen is open plus one verified check-in event per discovery.
 */
export async function ensureExploreLocationPermission(): Promise<void> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new TrackingPermissionError("location_services_disabled");
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    throw new TrackingPermissionError("foreground_denied");
  }
}

export async function getCurrentExploreLocation(): Promise<ExploreLocationFix> {
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    timestamp: pos.timestamp,
  };
}

export function watchExploreLocation(
  onUpdate: (fix: ExploreLocationFix) => void
): Promise<Location.LocationSubscription> {
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
    (pos) => {
      onUpdate({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      });
    }
  );
}
