import * as TaskManager from "expo-task-manager";
import type { LocationObject } from "expo-location";
import { appendTrackingLocation, TRACKING_LOCATION_TASK } from "./trackingSessionService";

function isTransientLocationError(message: string | undefined) {
  if (!message) return false;
  return message.includes("kCLErrorDomain Code=0") || message.toLowerCase().includes("location unknown");
}

TaskManager.defineTask(
  TRACKING_LOCATION_TASK,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations?: LocationObject[] }>) => {
    if (error) {
      if (!isTransientLocationError(error.message)) {
        console.warn("Active adventure location task skipped an update:", error.message);
      }
      return;
    }

    const locations = data?.locations ?? [];
    for (const location of locations) {
      await appendTrackingLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
        accuracy: location.coords.accuracy,
      });
    }
  }
);
