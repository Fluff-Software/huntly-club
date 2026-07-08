import {
  MIN_COMPONENT_DURATION_MS,
  snapToGridMs,
} from "./campfire-timeline";
import type { AudioComponentData, CampfireComponentRow } from "../types";

export function snapAudioDurationMs(ms: number): number {
  return Math.max(MIN_COMPONENT_DURATION_MS, snapToGridMs(ms));
}

export function audioComponentHasFile(component: CampfireComponentRow): boolean {
  if (component.type !== "audio") return false;
  const data = component.data as AudioComponentData;
  return Boolean(data.audioUrl?.trim());
}

export function getAudioComponentData(
  component: CampfireComponentRow
): AudioComponentData {
  return (component.data ?? {}) as AudioComponentData;
}
