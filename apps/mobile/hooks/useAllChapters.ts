import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/services/supabase";

export type StorySlide =
  | { type: "text"; value: string }
  | { type: "image"; value: string }
  | { type: "text-image"; text: string; image: string };

export type Chapter = {
  id: number;
  week_number: number;
  title: string | null;
  body: string | null;
  body_parts: string[] | null;
  body_slides: StorySlide[] | null;
  unlock_date: string;
};

export function useAllChapters(seasonId?: number | null): {
  chapters: Chapter[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    let query = supabase
      .from("chapters")
      .select("id, week_number, title, body, body_parts, body_slides, unlock_date")
      .lte("unlock_date", today)
      .order("unlock_date", { ascending: false });

    if (seasonId != null) {
      query = query.eq("season_id", seasonId);
    }

    const { data, error: chapterError } = await query;

    if (chapterError) {
      setError(chapterError.message ?? "Failed to load chapters");
      setChapters([]);
    } else {
      setChapters((data ?? []) as Chapter[]);
    }
    setLoading(false);
  }, [seasonId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    chapters,
    loading,
    error,
    refetch: fetchData,
  };
}
