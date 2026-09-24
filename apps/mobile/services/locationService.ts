import * as Location from "expo-location";
import { Linking, Platform } from "react-native";

export type LocationPermissionStatus = "granted" | "denied" | "undetermined";

/** Returns the current foreground location permission status without prompting. */
export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

/** Requests foreground location permission. Returns the resulting status. */
export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

/**
 * Opens the device app settings so the user can manually grant location.
 * Called when the OS has permanently denied the permission.
 */
export function openLocationSettings(): void {
  void Linking.openSettings();
}
