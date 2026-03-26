import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/services/supabase";

export type ChapterProgress = { total: number; completed: number };

export function useChapterProgress(profileId: number | null): {
  progressByChapterId: Record<number, ChapterProgress>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [progressByChapterId, setProgressByChapterId] = useState<Record<number, ChapterProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);

    const today = new Date().toISOString().slice(0, 10);

    const { data: chapterList, error: chaptersError } = await supabase
      .from("chapters")
      .select("id")
      .lte("unlock_date", today)
      .order("unlock_date", { ascending: false });

    if (chaptersError) {
      setError(chaptersError.message ?? "Failed to load chapters");
      setProgressByChapterId({});
      setLoading(false);
      return;
    }

    const chapterIds = (chapterList ?? []).map((c: { id: number }) => c.id);
    if (chapterIds.length === 0) {
      setProgressByChapterId({});
      setLoading(false);
      return;
    }

    const { data: caRows, error: caError } = await supabase
      .from("chapter_activities")
      .select("chapter_id, activity_id")
      .in("chapter_id", chapterIds);

    if (caError) {
      setError(caError.message ?? "Failed to load chapter activities");
      setProgressByChapterId({});
      setLoading(false);
      return;
    }

    const totalByChapter = new Map<number, number>();
    const activityIdsByChapter = new Map<number, number[]>();
    const allActivityIds = new Set<number>();

    for (const row of caRows ?? []) {
      const { chapter_id, activity_id } = row as { chapter_id: number; activity_id: number };
      totalByChapter.set(chapter_id, (totalByChapter.get(chapter_id) ?? 0) + 1);
      const list = activityIdsByChapter.get(chapter_id) ?? [];
      list.push(activity_id);
      activityIdsByChapter.set(chapter_id, list);
      allActivityIds.add(activity_id);
    }

    let completedActivityIds = new Set<number>();
    if (profileId != null && allActivityIds.size > 0) {
      const { data: progressRows, error: progressError } = await supabase
        .from("user_activity_progress")
        .select("activity_id")
        .eq("profile_id", profileId)
        .in("activity_id", Array.from(allActivityIds))
        .not("completed_at", "is", null);

      if (!progressError && progressRows) {
        completedActivityIds = new Set(progressRows.map((p: { activity_id: number }) => p.activity_id));
      }
    }

    const result: Record<number, ChapterProgress> = {};
    for (const chapterId of chapterIds) {
      const total = totalByChapter.get(chapterId) ?? 0;
      const activityIds = activityIdsByChapter.get(chapterId) ?? [];
      const completed = activityIds.filter((id) => completedActivityIds.has(id)).length;
      result[chapterId] = { total, completed };
    }

    setProgressByChapterId(result);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    progressByChapterId,
    loading,
    error,
    refetch: fetchData,
  };
}
