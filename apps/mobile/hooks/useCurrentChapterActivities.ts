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

export function useCurrentChapterActivities(): {
  activities: MissionCardData[];
  activityCards: ChapterActivityCard[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { currentChapter, loading: chapterLoading, error: chapterError, refetch: refetchChapter } = useCurrentChapter();
  const [activityCards, setActivityCards] = useState<ChapterActivityCard[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

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

  const loading = chapterLoading || activitiesLoading;
  const error = chapterError ?? activitiesError;

  const refetch = useCallback(async () => {
    await refetchChapter();
    if (currentChapter?.id) {
      await fetchActivities(currentChapter.id);
    }
  }, [refetchChapter, fetchActivities, currentChapter?.id]);

  return {
    activities: currentChapter ? activityCards.map(toMissionCardData) : [],
    activityCards: currentChapter ? activityCards : [],
    loading,
    error,
    refetch,
  };
}
