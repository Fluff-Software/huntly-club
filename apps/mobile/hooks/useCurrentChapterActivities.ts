import { useState, useEffect, useCallback } from "react";
import type { ImageSourcePropType } from "react-native";
import { supabase } from "@/services/supabase";
import type { MissionCardData } from "@/constants/missionCards";
import { useCurrentChapter } from "@/hooks/useCurrentChapter";

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

function toChapterActivityCard(
  row: { order: number; activities: ActivityRow | ActivityRow[] | null }
): ChapterActivityCard | null {
  const raw = row.activities;
  const a = Array.isArray(raw) ? raw[0] : raw;
  if (!a) return null;
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
  /** Next mission for the user in this chapter (first incomplete, or first in chapter if no profile) */
  nextMission: MissionCardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { currentChapter, loading: chapterLoading, error: chapterError, refetch: refetchChapter } = useCurrentChapter();
  const [activityCards, setActivityCards] = useState<ChapterActivityCard[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [completedActivityIds, setCompletedActivityIds] = useState<Set<string>>(new Set());

  const fetchCompletedForChapter = useCallback(async (chapterId: number, profileId: number | null) => {
    if (!profileId) {
      setCompletedActivityIds(new Set());
      return;
    }
    const { data: rows } = await supabase
      .from("chapter_activities")
      .select("activity_id")
      .eq("chapter_id", chapterId);
    const activityIds = (rows ?? []).map((r) => r.activity_id);
    if (activityIds.length === 0) {
      setCompletedActivityIds(new Set());
      return;
    }
    const { data: progress } = await supabase
      .from("user_activity_progress")
      .select("activity_id")
      .eq("profile_id", profileId)
      .in("activity_id", activityIds)
      .not("completed_at", "is", null);
    const completed = new Set((progress ?? []).map((p) => String(p.activity_id)));
    setCompletedActivityIds(completed);
  }, []);

  const fetchActivities = useCallback(async (chapterId: number) => {
    setActivitiesError(null);
    setActivitiesLoading(true);

    const { data: rows, error: activitiesError } = await supabase
      .from("chapter_activities")
      .select("order, activities(id, image, title, description, xp, categories)")
      .eq("chapter_id", chapterId)
      .order("order", { ascending: true });

    if (activitiesError) {
      setActivitiesError(activitiesError.message ?? "Failed to load activities");
      setActivityCards([]);
    } else {
      const cards = (rows ?? [])
        .map(toChapterActivityCard)
        .filter((c): c is ChapterActivityCard => c != null);
      setActivityCards(cards);
    }
    setActivitiesLoading(false);
  }, []);

  useEffect(() => {
    if (!currentChapter) {
      setActivitiesLoading(false);
      setActivitiesError(null);
      return;
    }
    fetchActivities(currentChapter.id);
  }, [currentChapter?.id, fetchActivities]);

  useEffect(() => {
    if (!currentChapter?.id) return;
    fetchCompletedForChapter(currentChapter.id, profileId);
  }, [currentChapter?.id, profileId, fetchCompletedForChapter]);

  const loading = chapterLoading || activitiesLoading;
  const error = chapterError ?? activitiesError;

  const refetch = useCallback(async () => {
    await refetchChapter();
    if (currentChapter?.id) {
      await fetchActivities(currentChapter.id);
      await fetchCompletedForChapter(currentChapter.id, profileId);
    }
  }, [refetchChapter, fetchActivities, fetchCompletedForChapter, currentChapter?.id, profileId]);

  // Next mission = first activity in chapter order that is not completed, or first activity if all complete / no profile
  const nextMission: MissionCardData | null =
    currentChapter && activityCards.length > 0
      ? (() => {
          const firstIncomplete = activityCards.find((c) => !completedActivityIds.has(c.id));
          const card = firstIncomplete ?? activityCards[0];
          return toMissionCardData(card);
        })()
      : null;

  return {
    activities: currentChapter ? activityCards.map(toMissionCardData) : [],
    activityCards: currentChapter ? activityCards : [],
    nextMission,
    loading,
    error,
    refetch,
  };
}
