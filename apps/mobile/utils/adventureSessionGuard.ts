import { type Href } from "expo-router";
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

export function routeForBlockingAdventure(blocking: BlockingAdventure): Href {
  if (blocking.kind === "hunt") {
    return {
      pathname: "/(tabs)/activity/scavenger/quest/active",
      params: { questId: blocking.questId, profileId: String(blocking.profileId) },
    } as Href;
  }
  if (blocking.kind === "cycle") {
    return "/(tabs)/activity/cycle-map";
  }
  return "/(tabs)/activity/walk-map";
}

/** Active hunt for a different quest/profile — redirect instead of starting a second hunt. */
export async function getConflictingHuntSession(
  questId: string,
  profileId: number
): Promise<(BlockingAdventure & { kind: "hunt" }) | null> {
  const hunt = await getActiveHuntSession();
  if (
    hunt?.status === "active" &&
    (hunt.questId !== questId || hunt.profileId !== profileId)
  ) {
    return {
      kind: "hunt",
      questId: hunt.questId,
      profileId: hunt.profileId,
    };
  }
  return null;
}
