import * as TaskManager from "expo-task-manager";
import type { LocationObject } from "expo-location";
import { appendTrackingLocation, TRACKING_LOCATION_TASK } from "./trackingSessionService";

TaskManager.defineTask(
  TRACKING_LOCATION_TASK,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations?: LocationObject[] }>) => {
    if (error) {
      console.error("Active adventure location task failed:", error.message);
      return;
    }

    const locations = data?.locations ?? [];
    for (const location of locations) {
      await appendTrackingLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
      });
    }
  }
);
