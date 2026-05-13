import { Appearance, Platform } from "react-native";
import ActivityLiveActivity, { type ActivityLiveActivityProps } from "@/live-activities/ActivityLiveActivity";
import type { ActiveTrackingSession } from "./trackingSessionService";
// #region agent log
import { agentLog } from "@/services/debugLog";
// #endregion

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatElapsed(startedAt: string, endedAt: string | null) {
  const endMs = endedAt ? new Date(endedAt).getTime() : Date.now();
  const totalSeconds = Math.max(0, Math.floor((endMs - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  return `${hours}h ${remMins}m`;
}

function toLiveActivityProps(session: ActiveTrackingSession): ActivityLiveActivityProps {
  const title = session.type === "cycle" ? "Cycle in progress" : "Walk in progress";
  const isComplete = session.status === "completed";
  return {
    sessionId: session.sessionId,
    activityType: session.type,
    title: isComplete ? "Adventure complete" : title,
    distance: formatDistance(session.distanceMeters),
    elapsed: formatElapsed(session.startedAt, session.endedAt),
    steps: session.type === "walk" && session.steps != null ? `${session.steps} steps` : null,
    isComplete,
    colorScheme: Appearance.getColorScheme() === "dark" ? "dark" : "light",
  };
}

export async function syncActivityLiveSurface(session: ActiveTrackingSession): Promise<void> {
  if (Platform.OS !== "ios") return;

  try {
    const props = toLiveActivityProps(session);
    const instances = ActivityLiveActivity.getInstances();
    const action = session.status === "completed" ? "end" : instances.length > 0 ? "update" : "start";
    // #region agent log
    agentLog({
      hypothesisId: "H1",
      location: "activityLiveSurfaceService.ts:syncActivityLiveSurface",
      message: "syncActivityLiveSurface called",
      data: { action, instanceCount: instances.length, props, status: session.status, sessionId: session.sessionId },
    });
    // #endregion
    if (session.status === "completed") {
      await Promise.all(instances.map((instance) => instance.end("immediate", props, new Date())));
      return;
    }

    if (instances.length > 0) {
      await Promise.all(instances.map((instance) => instance.update(props)));
      return;
    }

    ActivityLiveActivity.start(props, `huntlyclub://activity/live?sessionId=${session.sessionId}`);
  } catch (err) {
    // #region agent log
    agentLog({
      hypothesisId: "H1",
      location: "activityLiveSurfaceService.ts:syncActivityLiveSurface-catch",
      message: "syncActivityLiveSurface threw",
      data: { error: String(err) },
    });
    // #endregion
  }
}

export async function endActivityLiveSurface(session: ActiveTrackingSession): Promise<void> {
  if (Platform.OS !== "ios") return;

  try {
    const props = toLiveActivityProps({ ...session, status: "completed" });
    await Promise.all(ActivityLiveActivity.getInstances().map((instance) => instance.end("immediate", props, new Date())));
  } catch {
    // ignore
  }
}
