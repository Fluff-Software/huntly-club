import type { ImageSourcePropType } from "react-native";
import { getActivityImageSource } from "@/services/packService";
import type { MissionCardData } from "@/constants/missionCards";

const DEFAULT_CARD_IMAGE = require("@/assets/images/laser-fortress.jpg");

export type RewardCardSnapshot = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  xp: number | null;
};

export function buildRewardCardSnapshot(activity: {
  id: number;
  title: string;
  description?: string | null;
  image?: string | null;
  xp?: number | null;
}): string {
  return JSON.stringify({
    id: String(activity.id),
    title: activity.title,
    description: activity.description ?? "",
    image: activity.image ?? null,
    xp: activity.xp ?? null,
  } satisfies RewardCardSnapshot);
}

export function missionCardFromSnapshot(
  raw: string | undefined
): { card: MissionCardData | null; xp: number | null } {
  if (!raw) return { card: null, xp: null };
  try {
    const snapshot = JSON.parse(raw) as RewardCardSnapshot;
    const imageSource = getActivityImageSource(snapshot.image);
    return {
      card: {
        id: snapshot.id,
        title: snapshot.title,
        description: snapshot.description,
        image: (imageSource ?? DEFAULT_CARD_IMAGE) as ImageSourcePropType,
      },
      xp: snapshot.xp,
    };
  } catch {
    return { card: null, xp: null };
  }
}
