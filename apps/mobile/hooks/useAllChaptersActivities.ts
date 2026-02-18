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

type ChapterActivityRow = {
  chapter_id: number;
  order: number;
  activities: ActivityRow | ActivityRow[] | null;
};

function toChapterActivityCard(row: ChapterActivityRow): ChapterActivityCard | null {
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

export function useAllChaptersActivities(): {
  activities: MissionCardData[];
  activityCards: ChapterActivityCard[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [activityCards, setActivityCards] = useState<ChapterActivityCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);

    const today = new Date().toISOString().slice(0, 10);

    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("id")
      .lte("unlock_date", today)
      .order("unlock_date", { ascending: false });

    if (chaptersError) {
      setError(chaptersError.message ?? "Failed to load chapters");
      setActivityCards([]);
      setLoading(false);
      return;
    }

    const chapterIds = (chapters ?? []).map((c) => c.id);
    if (chapterIds.length === 0) {
      setActivityCards([]);
      setLoading(false);
      return;
    }

    const { data: rows, error: activitiesError } = await supabase
      .from("chapter_activities")
      .select("chapter_id, order, activities(id, image, title, description, xp, categories)")
      .in("chapter_id", chapterIds)
      .order("order", { ascending: true });

    if (activitiesError) {
      setError(activitiesError.message ?? "Failed to load activities");
      setActivityCards([]);
      setLoading(false);
      return;
    }

    const chapterOrder = new Map(chapterIds.map((id, i) => [id, i]));
    const sorted = (rows ?? []).sort((a, b) => {
      const aIdx = chapterOrder.get((a as ChapterActivityRow).chapter_id) ?? 0;
      const bIdx = chapterOrder.get((b as ChapterActivityRow).chapter_id) ?? 0;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return (a as ChapterActivityRow).order - (b as ChapterActivityRow).order;
    });

    const seen = new Set<string>();
    const cards: ChapterActivityCard[] = [];
    for (const row of sorted) {
      const card = toChapterActivityCard(row as ChapterActivityRow);
      if (card && !seen.has(card.id)) {
        seen.add(card.id);
        cards.push(card);
      }
    }
    setActivityCards(cards);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    activities: activityCards.map(toMissionCardData),
    activityCards,
    loading,
    error,
    refetch: fetchData,
  };
}

/** Chapter with its activities (latest season, unlocked only). For Missions screen. */
export type ChapterWithActivities = {
  id: number;
  week_number: number;
  title: string | null;
  unlock_date: string;
  activities: ChapterActivityCard[];
};

export function useChaptersWithActivities(): {
  chapters: ChapterWithActivities[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [chapters, setChapters] = useState<ChapterWithActivities[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    const { data: latestSeason, error: seasonError } = await supabase
      .from("seasons")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (seasonError || !latestSeason) {
      setError(seasonError?.message ?? "Failed to load season");
      setChapters([]);
      setLoading(false);
      return;
    }

    const { data: chapterList, error: chaptersError } = await supabase
      .from("chapters")
      .select("id, week_number, title, unlock_date")
      .eq("season_id", latestSeason.id)
      .lte("unlock_date", today)
      .order("unlock_date", { ascending: false });

    if (chaptersError) {
      setError(chaptersError.message ?? "Failed to load chapters");
      setChapters([]);
      setLoading(false);
      return;
    }

    const chapterIds = (chapterList ?? []).map((c: { id: number }) => c.id);
    if (chapterIds.length === 0) {
      setChapters([]);
      setLoading(false);
      return;
    }

    const { data: rows, error: activitiesError } = await supabase
      .from("chapter_activities")
      .select("chapter_id, order, activities(id, image, title, description, xp, categories)")
      .in("chapter_id", chapterIds)
      .order("order", { ascending: true });

    if (activitiesError) {
      setError(activitiesError.message ?? "Failed to load activities");
      setChapters([]);
      setLoading(false);
      return;
    }

    const byChapter = new Map<number, ChapterActivityCard[]>();
    for (const row of rows ?? []) {
      const r = row as ChapterActivityRow;
      const card = toChapterActivityCard(r);
      if (!card) continue;
      const list = byChapter.get(r.chapter_id) ?? [];
      list.push(card);
      byChapter.set(r.chapter_id, list);
    }

    const result: ChapterWithActivities[] = (chapterList ?? []).map(
      (ch: { id: number; week_number: number; title: string | null; unlock_date: string }) => ({
        id: ch.id,
        week_number: ch.week_number,
        title: ch.title,
        unlock_date: ch.unlock_date,
        activities: byChapter.get(ch.id) ?? [],
      })
    );
    setChapters(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { chapters, loading, error, refetch: fetchData };
}
