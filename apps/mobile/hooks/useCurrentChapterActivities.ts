import { useState, useEffect, useCallback } from "react";
import type { ImageSourcePropType } from "react-native";
import { supabase } from "@/services/supabase";
import type { MissionCardData } from "@/constants/missionCards";

const DEFAULT_MISSION_IMAGE = require("@/assets/images/laser-fortress.jpg");

export type ChapterActivityCard = MissionCardData & {
  xp: number | null;
  categories: string[];
};

type ActivityRow = {
  id: number;
  image: string | null;
  title: string;
  description: string | null;
  xp: number | null;
  categories?: string[] | null;
};

function toChapterActivityCard(a: ActivityRow): ChapterActivityCard {
  const image: ImageSourcePropType = a.image ? { uri: a.image } : DEFAULT_MISSION_IMAGE;
  return {
    id: String(a.id),
    image,
    title: a.title,
    description: a.description ?? "",
    xp: a.xp ?? null,
    categories: Array.isArray(a.categories) ? a.categories : [],
  };
}

function toMissionCardData(card: ChapterActivityCard): MissionCardData {
  return { id: card.id, image: card.image, title: card.title, description: card.description };
}

export function useCurrentChapterActivities(profileId: number | null): {
  activities: MissionCardData[];
  activityCards: ChapterActivityCard[];
  /** Next mission for the user (first incomplete published mission, or most recent if all done) */
  nextMission: MissionCardData | null;
  /** Latest unfinished published mission for the user */
  latestUnfinishedMission: MissionCardData | null;
  /** Most recently published mission */
  latestMission: MissionCardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [activityCards, setActivityCards] = useState<ChapterActivityCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedActivityIds, setCompletedActivityIds] = useState<Set<string>>(new Set());

  const fetchActivities = useCallback(async () => {
    setError(null);
    setLoading(true);

    const { data: rows, error: fetchError } = await supabase
      .from("activities")
      .select("id, image, title, description, xp, categories")
      .eq("content_status", "published")
      .order("id", { ascending: false });

    if (fetchError) {
      setError(fetchError.message ?? "Failed to load activities");
      setActivityCards([]);
      setLoading(false);
      return;
    }

    const cards = (rows ?? []).map((a: ActivityRow) => toChapterActivityCard(a));
    setActivityCards(cards);

    if (profileId && cards.length > 0) {
      const activityIds = cards.map((c) => parseInt(c.id, 10));
      const { data: progress } = await supabase
        .from("user_activity_progress")
        .select("activity_id")
        .eq("profile_id", profileId)
        .in("activity_id", activityIds)
        .not("completed_at", "is", null);
      setCompletedActivityIds(
        new Set((progress ?? []).map((p: { activity_id: number }) => String(p.activity_id)))
      );
    } else {
      setCompletedActivityIds(new Set());
    }

    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const latestMission: MissionCardData | null =
    activityCards.length > 0 ? toMissionCardData(activityCards[0]) : null;

  const nextMission: MissionCardData | null =
    activityCards.length > 0
      ? (() => {
          const firstIncomplete = activityCards.find((c) => !completedActivityIds.has(c.id));
          return toMissionCardData(firstIncomplete ?? activityCards[0]);
        })()
      : null;

  const latestUnfinishedMission: MissionCardData | null =
    activityCards.length > 0 && profileId != null
      ? (() => {
          const incomplete = activityCards.find((c) => !completedActivityIds.has(c.id));
          return incomplete ? toMissionCardData(incomplete) : null;
        })()
      : null;

  return {
    activities: activityCards.map(toMissionCardData),
    activityCards,
    nextMission,
    latestUnfinishedMission,
    latestMission,
    loading,
    error,
    refetch: fetchActivities,
  };
}
