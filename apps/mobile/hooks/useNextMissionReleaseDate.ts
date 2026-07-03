import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/services/supabase";
import { ukTodayForChapterUnlockGate } from "@/utils/ukChapterTime";

export function useNextMissionReleaseDate(): {
  nextReleaseDate: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [nextReleaseDate, setNextReleaseDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);
    const today = ukTodayForChapterUnlockGate();

    const { data: sessionRows, error: sessionsError } = await supabase
      .from("campfire_sessions")
      .select("missions");

    if (sessionsError) {
      setError(sessionsError.message ?? "Failed to load sessions");
      setNextReleaseDate(null);
      setLoading(false);
      return;
    }

    const missionIds = new Set<number>();
    for (const row of sessionRows ?? []) {
      const ids = (row.missions as number[] | null) ?? [];
      for (const id of ids) {
        if (Number.isFinite(id)) missionIds.add(Number(id));
      }
    }

    if (missionIds.size === 0) {
      setNextReleaseDate(null);
      setLoading(false);
      return;
    }

    const { data, error: activitiesError } = await supabase
      .from("activities")
      .select("release_date")
      .in("id", [...missionIds])
      .eq("content_status", "published")
      .not("release_date", "is", null)
      .gt("release_date", today)
      .order("release_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (activitiesError) {
      setError(activitiesError.message ?? "Failed to load next release");
      setNextReleaseDate(null);
      setLoading(false);
      return;
    }

    setNextReleaseDate((data?.release_date as string | undefined) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { nextReleaseDate, loading, error, refetch: fetchData };
}
