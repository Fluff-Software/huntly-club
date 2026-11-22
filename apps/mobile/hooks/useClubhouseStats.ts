import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/services/supabase";

export type ClubhouseStats = {
  /** Consecutive weeks (ending this week or last) with at least one mission or card. */
  streakWeeks: number;
  missionsThisWeek: number;
  cardsThisWeek: number;
  missionsTotal: number;
  lastActivityAt: string | null;
  lastMissionAt: string | null;
};

const EMPTY: ClubhouseStats = {
  streakWeeks: 0,
  missionsThisWeek: 0,
  cardsThisWeek: 0,
  missionsTotal: 0,
  lastActivityAt: null,
  lastMissionAt: null,
};

/** Monday 00:00 local of the week containing `d`. */
export function weekStart(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const offset = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - offset);
  return out;
}

export function computeStreakWeeks(timestamps: string[], now = new Date()): number {
  if (timestamps.length === 0) return 0;
  const weeks = new Set(timestamps.map((t) => weekStart(new Date(t)).getTime()));
  let cursor = weekStart(now);
  // A streak survives a quiet week-so-far: count from last week if this week is empty.
  if (!weeks.has(cursor.getTime())) cursor = new Date(cursor.getTime() - 7 * 86400000);
  let streak = 0;
  while (weeks.has(cursor.getTime())) {
    streak++;
    cursor = new Date(cursor.getTime() - 7 * 86400000);
  }
  return streak;
}

/** Household activity for the Clubhouse header and "Your week" card. */
export function useClubhouseStats(profileIds: number[]) {
  const [stats, setStats] = useState<ClubhouseStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const key = profileIds.join(",");

  const refetch = useCallback(async () => {
    const ids = key ? key.split(",").map(Number) : [];
    if (ids.length === 0) {
      setStats(EMPTY);
      setLoading(false);
      return;
    }
    const since = new Date(Date.now() - 120 * 86400000).toISOString();
    const [missionsRes, cardsRes, totalRes] = await Promise.all([
      supabase
        .from("user_activity_progress")
        .select("completed_at")
        .in("profile_id", ids)
        .not("completed_at", "is", null)
        .gte("completed_at", since)
        .order("completed_at", { ascending: false })
        .limit(200),
      supabase
        .from("explore_stop_claims")
        .select("claimed_at")
        .in("profile_id", ids)
        .gte("claimed_at", since)
        .order("claimed_at", { ascending: false })
        .limit(200),
      supabase
        .from("user_activity_progress")
        .select("activity_id", { count: "exact", head: true })
        .in("profile_id", ids)
        .not("completed_at", "is", null),
    ]);
    const missionTimes = ((missionsRes.data ?? []) as { completed_at: string }[]).map((r) => r.completed_at);
    const cardTimes = ((cardsRes.data ?? []) as { claimed_at: string }[]).map((r) => r.claimed_at);
    const thisWeek = weekStart(new Date()).getTime();
    const all = [...missionTimes, ...cardTimes].sort().reverse();
    setStats({
      streakWeeks: computeStreakWeeks(all),
      missionsThisWeek: missionTimes.filter((t) => new Date(t).getTime() >= thisWeek).length,
      cardsThisWeek: cardTimes.filter((t) => new Date(t).getTime() >= thisWeek).length,
      missionsTotal: totalRes.count ?? missionTimes.length,
      lastActivityAt: all[0] ?? null,
      lastMissionAt: missionTimes[0] ?? null,
    });
    setLoading(false);
  }, [key]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { stats, loading, refetch };
}
