import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/services/supabase";

export type CurrentChapter = {
  id: number;
  week_number: number;
  title: string | null;
  body: string | null;
  unlock_date: string;
} | null;

export function useCurrentChapter(): {
  currentChapter: CurrentChapter;
  nextChapterDate: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [currentChapter, setCurrentChapter] = useState<CurrentChapter>(null);
  const [nextChapterDate, setNextChapterDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);

    const today = new Date().toISOString().slice(0, 10);

    // Latest season (highest id)
    const { data: latestSeason, error: seasonError } = await supabase
      .from("seasons")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (seasonError || !latestSeason) {
      setError(seasonError?.message ?? "Failed to load season");
      setCurrentChapter(null);
      setNextChapterDate(null);
      setLoading(false);
      return;
    }

    // Newest unlocked chapter in that season (unlock_date <= today, most recent first)
    const { data: chapterData, error: chapterError } = await supabase
      .from("chapters")
      .select("id, week_number, title, body, unlock_date")
      .eq("season_id", latestSeason.id)
      .lte("unlock_date", today)
      .order("unlock_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (chapterError) {
      setError(chapterError.message ?? "Failed to load chapter");
      setCurrentChapter(null);
      setNextChapterDate(null);
      setLoading(false);
      return;
    }

    const { data: nextData, error: nextError } = await supabase
      .from("chapters")
      .select("unlock_date")
      .eq("season_id", latestSeason.id)
      .gt("unlock_date", today)
      .order("unlock_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextError) {
      setError(nextError.message ?? "Failed to load next chapter date");
      setLoading(false);
      setCurrentChapter(chapterData ?? null);
      setNextChapterDate(null);
      return;
    }

    setCurrentChapter(chapterData ?? null);
    setNextChapterDate(nextData?.unlock_date ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    currentChapter,
    nextChapterDate,
    loading,
    error,
    refetch: fetchData,
  };
}
