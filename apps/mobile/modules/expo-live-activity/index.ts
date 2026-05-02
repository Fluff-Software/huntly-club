import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

export type LiveActivityType = "walk" | "cycle";

export type LiveActivityData = {
  distanceMeters: number;
  steps?: number;
};

type NativeLiveActivityModule = {
  isSupported(): boolean;
  startActivity(
    isWalk: boolean,
    distanceMeters: number,
    steps: number | null
  ): Promise<string | null>;
  updateActivity(
    activityId: string,
    distanceMeters: number,
    steps: number | null
  ): Promise<void>;
  endActivity(
    activityId: string,
    distanceMeters: number,
    steps: number | null
  ): Promise<void>;
};

let _module: NativeLiveActivityModule | null = null;

function getNativeModule(): NativeLiveActivityModule | null {
  if (Platform.OS !== "ios") return null;
  if (!_module) {
    try {
      _module = requireNativeModule("ExpoLiveActivity");
    } catch {
      return null;
    }
  }
  return _module;
}

export function isLiveActivitySupported(): boolean {
  const mod = getNativeModule();
  if (!mod) return false;
  try {
    return mod.isSupported();
  } catch {
    return false;
  }
}

export async function startLiveActivity(
  type: LiveActivityType,
  data: LiveActivityData
): Promise<string | null> {
  const mod = getNativeModule();
  if (!mod) return null;
  try {
    return await mod.startActivity(
      type === "walk",
      data.distanceMeters,
      data.steps ?? null
    );
  } catch {
    return null;
  }
}

export async function updateLiveActivity(
  activityId: string,
  data: LiveActivityData
): Promise<void> {
  const mod = getNativeModule();
  if (!mod) return;
  try {
    await mod.updateActivity(activityId, data.distanceMeters, data.steps ?? null);
  } catch {
    // ignore
  }
}

export async function endLiveActivity(
  activityId: string,
  data: LiveActivityData
): Promise<void> {
  const mod = getNativeModule();
  if (!mod) return;
  try {
    await mod.endActivity(activityId, data.distanceMeters, data.steps ?? null);
  } catch {
    // ignore
  }
}
