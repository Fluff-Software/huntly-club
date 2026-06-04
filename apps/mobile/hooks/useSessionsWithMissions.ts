import { useState, useEffect, useCallback, useMemo } from "react";
import type { ImageSourcePropType } from "react-native";
import { supabase } from "@/services/supabase";
import type { MissionCardData } from "@/constants/missionCards";
import { ukTodayForChapterUnlockGate } from "@/utils/ukChapterTime";

const DEFAULT_MISSION_IMAGE = require("@/assets/images/laser-fortress.jpg");

export type MissionActivityCard = MissionCardData & {
  xp: number | null;
  categories: string[];
};

export type SessionWithActivities = {
  id: number;
  title: string;
  scheduled_at: string | null;
  activities: MissionActivityCard[];
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

type CampfireSessionRow = {
  id: number;
  title: string;
  scheduled_at: string | null;
  missions: number[] | null;
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

function sortSessions(a: CampfireSessionRow, b: CampfireSessionRow): number {
  const aTime = a.scheduled_at ? Date.parse(a.scheduled_at) : Number.NEGATIVE_INFINITY;
  const bTime = b.scheduled_at ? Date.parse(b.scheduled_at) : Number.NEGATIVE_INFINITY;
  if (aTime !== bTime) return bTime - aTime;
  return b.id - a.id;
}

function orderMissionIds(
  missionIds: number[],
  activitiesById: Map<number, ActivityRow>
): number[] {
  return [...missionIds].sort((a, b) => {
    const rowA = activitiesById.get(a);
    const rowB = activitiesById.get(b);
    const orderA = rowA?.session_order;
    const orderB = rowB?.session_order;
    if (orderA != null && orderB != null && orderA !== orderB) return orderA - orderB;
    if (orderA != null && orderB == null) return -1;
    if (orderA == null && orderB != null) return 1;
    const dateA = rowA?.release_date ?? "";
    const dateB = rowB?.release_date ?? "";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return a - b;
  });
}

export type UseSessionsWithMissionsOptions = {
  /** When set, loads which activities any household profile has completed (one query). */
  allProfileIds?: number[];
  /** Activity ids to include in the any-profile completion check (e.g. saved first mission). */
  extraActivityIds?: number[];
};

export function useSessionsWithMissions(
  profileId: number | null = null,
  options?: UseSessionsWithMissionsOptions
): {
  sessions: SessionWithActivities[];
  completedActivityIds: Set<string>;
  completedByAnyProfileActivityIds: Set<string>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [sessions, setSessions] = useState<SessionWithActivities[]>([]);
  const [completedActivityIds, setCompletedActivityIds] = useState<Set<string>>(new Set());
  const [completedByAnyProfileActivityIds, setCompletedByAnyProfileActivityIds] = useState<
    Set<string>
  >(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const allProfileIds = options?.allProfileIds;
  const extraActivityIds = options?.extraActivityIds;

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);
    const today = ukTodayForChapterUnlockGate();

    const { data: sessionRows, error: sessionsError } = await supabase
      .from("campfire_sessions")
      .select("id, title, scheduled_at, missions");

    if (sessionsError) {
      setError(sessionsError.message ?? "Failed to load campfire sessions");
      setSessions([]);
      setLoading(false);
      return;
    }

    const allMissionIds = new Set<number>();
    for (const row of sessionRows ?? []) {
      const session = row as CampfireSessionRow;
      const ids = session.missions ?? [];
      if (ids.length === 0) continue;
      for (const id of ids) {
        if (Number.isFinite(id)) allMissionIds.add(Number(id));
      }
    }

    if (allMissionIds.size === 0) {
      setSessions([]);
      setCompletedActivityIds(new Set());
      const extraOnlyIds = (extraActivityIds ?? []).filter((id) => Number.isFinite(id));
      const householdProfileIds = allProfileIds?.filter((id) => Number.isFinite(id)) ?? [];
      if (householdProfileIds.length > 0 && extraOnlyIds.length > 0) {
        const { data: anyProfileRows } = await supabase
          .from("user_activity_progress")
          .select("activity_id")
          .in("profile_id", householdProfileIds)
          .in("activity_id", extraOnlyIds)
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
      return;
    }

    const { data: activityRows, error: activitiesError } = await supabase
      .from("activities")
      .select("id, image, title, description, xp, categories, release_date, session_order")
      .in("id", [...allMissionIds])
      .eq("content_status", "published")
      .not("release_date", "is", null)
      .lte("release_date", today);

    if (activitiesError) {
      setError(activitiesError.message ?? "Failed to load missions");
      setSessions([]);
      setLoading(false);
      return;
    }

    const activitiesById = new Map<number, ActivityRow>();
    for (const row of activityRows ?? []) {
      activitiesById.set((row as ActivityRow).id, row as ActivityRow);
    }

    const result: SessionWithActivities[] = [];
    const sortedSessions = [...(sessionRows ?? [])].sort(sortSessions) as CampfireSessionRow[];

    for (const session of sortedSessions) {
      const missionIds = session.missions ?? [];
      if (missionIds.length === 0) continue;
      const orderedIds = orderMissionIds(
        missionIds.filter((id) => activitiesById.has(id)),
        activitiesById
      );
      const activities = orderedIds
        .map((id) => activitiesById.get(id))
        .filter((a): a is ActivityRow => a != null)
        .map(toMissionActivityCard);

      if (activities.length > 0) {
        result.push({
          id: session.id,
          title: session.title,
          scheduled_at: session.scheduled_at,
          activities,
        });
      }
    }

    setSessions(result);

    const allActivityIds = result.flatMap((s) => s.activities.map((a) => a.id));
    const numericActivityIds = [
      ...new Set([
        ...allActivityIds.map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id)),
        ...(extraActivityIds ?? []).filter((id) => Number.isFinite(id)),
      ]),
    ];

    if (profileId != null && allActivityIds.length > 0) {
      const { data: progressRows } = await supabase
        .from("user_activity_progress")
        .select("activity_id")
        .eq("profile_id", profileId)
        .in("activity_id", allActivityIds.map((id) => parseInt(id, 10)))
        .not("completed_at", "is", null);
      const completed = new Set(
        (progressRows ?? []).map((p: { activity_id: number }) => String(p.activity_id))
      );
      setCompletedActivityIds(completed);
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
  }, [profileId, allProfileIds, extraActivityIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    sessions,
    completedActivityIds,
    completedByAnyProfileActivityIds,
    loading,
    error,
    refetch: fetchData,
  };
}

function toMissionCardData(card: MissionActivityCard): MissionCardData {
  return { id: card.id, image: card.image, title: card.title, description: card.description };
}

/** Missions for the current (newest scheduled) campfire session. */
export function useCurrentSessionMissions(profileId: number | null): {
  activities: MissionCardData[];
  activityCards: MissionActivityCard[];
  nextMission: MissionCardData | null;
  latestUnfinishedMission: MissionCardData | null;
  latestMission: MissionCardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { sessions, completedActivityIds, loading, error, refetch } =
    useSessionsWithMissions(profileId);

  const currentSession = sessions[0] ?? null;
  const activityCards = currentSession?.activities ?? [];

  const { nextMission, latestUnfinishedMission, latestMission } = useMemo(() => {
    if (activityCards.length === 0) {
      return {
        nextMission: null,
        latestUnfinishedMission: null,
        latestMission: null,
      };
    }

    const latest = toMissionCardData(activityCards[activityCards.length - 1]);
    let next: MissionCardData | null = null;
    let latestUnfinished: MissionCardData | null = null;

    for (const card of activityCards) {
      if (!completedActivityIds.has(card.id)) {
        if (!next) next = toMissionCardData(card);
        latestUnfinished = toMissionCardData(card);
      }
    }

    return {
      nextMission: next ?? latest,
      latestUnfinishedMission: latestUnfinished,
      latestMission: latest,
    };
  }, [activityCards, completedActivityIds]);

  return {
    activities: activityCards.map(toMissionCardData),
    activityCards,
    nextMission,
    latestUnfinishedMission,
    latestMission,
    loading,
    error,
    refetch,
  };
}
