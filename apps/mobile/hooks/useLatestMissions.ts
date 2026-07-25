import { useState, useEffect, useCallback } from "react";
import type { ImageSourcePropType } from "react-native";
import { supabase } from "@/services/supabase";
import type { MissionCardData } from "@/constants/missionCards";
import { ukTodayForChapterUnlockGate } from "@/utils/ukChapterTime";

const DEFAULT_MISSION_IMAGE = require("@/assets/images/laser-fortress.jpg");

export type MissionActivityCard = MissionCardData & {
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
  release_date: string | null;
  session_order: number | null;
};

function toMissionActivityCard(a: ActivityRow): MissionActivityCard {
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

export type UseLatestMissionsOptions = {
  /** Max number of missions to return, newest release_date first. Defaults to 6. */
  limit?: number;
  /** When set, loads which activities any household profile has completed (one query). */
  allProfileIds?: number[];
  /** Activity ids to include in the any-profile completion check (e.g. saved first mission). */
  extraActivityIds?: number[];
};

/** The most recently released, published missions — newest release_date first. */
export function useLatestMissions(
  profileId: number | null = null,
  options?: UseLatestMissionsOptions
): {
  missions: MissionActivityCard[];
  completedActivityIds: Set<string>;
  completedByAnyProfileActivityIds: Set<string>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const limit = options?.limit ?? 6;
  const allProfileIds = options?.allProfileIds;
  const extraActivityIds = options?.extraActivityIds;

  const [missions, setMissions] = useState<MissionActivityCard[]>([]);
  const [completedActivityIds, setCompletedActivityIds] = useState<Set<string>>(new Set());
  const [completedByAnyProfileActivityIds, setCompletedByAnyProfileActivityIds] = useState<
    Set<string>
  >(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);
    const today = ukTodayForChapterUnlockGate();

    const { data: activityRows, error: activitiesError } = await supabase
      .from("activities")
      .select("id, image, title, description, xp, categories, release_date, session_order")
      .eq("content_status", "published")
      .not("release_date", "is", null)
      .lte("release_date", today)
      .order("release_date", { ascending: false })
      .order("session_order", { ascending: true })
      .order("id", { ascending: false })
      .limit(limit);

    if (activitiesError) {
      setError(activitiesError.message ?? "Failed to load missions");
      setMissions([]);
      setLoading(false);
      return;
    }

    const cards = (activityRows ?? []).map((row) => toMissionActivityCard(row as ActivityRow));
    setMissions(cards);

    const activityIds = cards.map((c) => c.id);
    const numericActivityIds = [
      ...new Set([
        ...activityIds.map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id)),
        ...(extraActivityIds ?? []).filter((id) => Number.isFinite(id)),
      ]),
    ];

    if (profileId != null && activityIds.length > 0) {
      const { data: progressRows } = await supabase
        .from("user_activity_progress")
        .select("activity_id")
        .eq("profile_id", profileId)
        .in("activity_id", activityIds.map((id) => parseInt(id, 10)))
        .not("completed_at", "is", null);
      setCompletedActivityIds(
        new Set((progressRows ?? []).map((p: { activity_id: number }) => String(p.activity_id)))
      );
    } else {
      setCompletedActivityIds(new Set());
    }

    const householdProfileIds = allProfileIds?.filter((id) => Number.isFinite(id)) ?? [];
    if (householdProfileIds.length > 0 && numericActivityIds.length > 0) {
      const { data: anyProfileRows } = await supabase
        .from("user_activity_progress")
        .select("activity_id")
        .in("profile_id", householdProfileIds)
        .in("activity_id", numericActivityIds)
        .not("completed_at", "is", null);
      setCompletedByAnyProfileActivityIds(
        new Set(
          (anyProfileRows ?? []).map((p: { activity_id: number }) => String(p.activity_id))
        )
      );
    } else {
      setCompletedByAnyProfileActivityIds(new Set());
    }

    setLoading(false);
  }, [profileId, allProfileIds, extraActivityIds, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    missions,
    completedActivityIds,
    completedByAnyProfileActivityIds,
    loading,
    error,
    refetch: fetchData,
  };
}
