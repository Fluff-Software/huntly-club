import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/services/supabase";

export type Chapter = {
  id: number;
  week_number: number;
  title: string | null;
  body: string | null;
  body_parts: string[] | null;
  unlock_date: string;
};

export function useAllChapters(): {
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

    const { data, error: chapterError } = await supabase
      .from("chapters")
      .select("id, week_number, title, body, body_parts, unlock_date")
      .lte("unlock_date", today)
      .order("unlock_date", { ascending: false });

    if (chapterError) {
      setError(chapterError.message ?? "Failed to load chapters");
      setChapters([]);
    } else {
      setChapters((data ?? []) as Chapter[]);
    }
    setLoading(false);
  }, []);

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
