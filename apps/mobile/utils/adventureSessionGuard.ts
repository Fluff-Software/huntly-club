import { getActiveHuntSession } from "@/services/activeHuntSessionService";
import { getActiveTrackingSession } from "@/services/trackingSessionService";

export type BlockingAdventure =
  | { kind: "walk" }
  | { kind: "cycle" }
  | { kind: "hunt"; questId: string; profileId: number };

/** Returns the other active adventure that should block starting `forActivity`. */
export async function getBlockingAdventure(
  forActivity: "walk" | "cycle" | "hunt"
): Promise<BlockingAdventure | null> {
  if (forActivity === "hunt") {
    const tracking = await getActiveTrackingSession();
    if (tracking?.status === "active") {
      return { kind: tracking.type === "cycle" ? "cycle" : "walk" };
    }
    return null;
  }

  const hunt = await getActiveHuntSession();
  if (hunt?.status === "active") {
    return {
      kind: "hunt",
      questId: hunt.questId,
      profileId: hunt.profileId,
    };
  }
  return null;
}

export function routeForBlockingAdventure(blocking: BlockingAdventure): string {
  if (blocking.kind === "hunt") {
    return `/(tabs)/activity/scavenger/quest/${blocking.questId}/active?profileId=${blocking.profileId}`;
  }
  if (blocking.kind === "cycle") {
    return "/(tabs)/activity/cycle-map";
  }
  return "/(tabs)/activity/walk-map";
}
