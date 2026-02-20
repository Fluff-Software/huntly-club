import { supabase } from "./supabase";

/** Start and end of current month in ISO format for Supabase filters. */
function getCurrentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export interface TeamActivityLogEntry {
  id: number;
  profile_id: number;
  activity_id: number;
  status: "completed";
  completed_at: string | null;
  notes: string | null;
  profile: {
    id: number;
    name: string;
    nickname: string | null;
    colour: string;
    team: number;
  };
  activity: {
    id: number;
    title: string;
    description: string | null;
    image: string | null;
    xp: number;
  };
}

export interface TeamInfo {
  id: number;
  name: string;
  colour: string | null;
  team_xp: number;
}

export const getTeamActivityLogs = async (
  teamId: number,
  limit: number = 20
): Promise<TeamActivityLogEntry[]> => {
  const { data, error } = await supabase
    .from("user_activity_progress")
    .select(
      `
      id,
      profile_id,
      activity_id,
      completed_at,
      notes,
      profile:profiles!inner(
        id,
        name,
        nickname,
        colour,
        team
      ),
      activity:activities!inner(
        id,
        title,
        description,
        image,
        xp
      )
    `
    )
    .eq("profile.team", teamId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching team activity logs:", error);
    throw new Error(`Failed to fetch team activity logs: ${error.message}`);
  }

  return (data ?? []).map((row) => ({ ...row, status: "completed" as const }));
};

export const getTeamActivityLogsByStatus = async (
  teamId: number,
  status: "started" | "completed",
  limit: number = 20
): Promise<TeamActivityLogEntry[]> => {
  const logs = await getTeamActivityLogs(teamId, limit);
  if (status === "started") return [];
  return logs;
};

export const getTeamInfo = async (teamId: number): Promise<TeamInfo | null> => {
  try {
    console.log("Fetching team info for team ID:", teamId);

    const { data, error } = await supabase
      .from("teams")
      .select("id, name, colour, team_xp")
      .eq("id", teamId)
      .single();

    if (error) {
      console.error("Error fetching team info:", error);
      if (error.code === "PGRST116") {
        // No rows returned
        console.log("No team found with ID:", teamId);
        return null;
      }
      throw new Error(`Failed to fetch team info: ${error.message}`);
    }

    console.log("Team info fetched successfully:", data);
    return data;
  } catch (err) {
    console.error("Exception in getTeamInfo:", err);
    throw err;
  }
};

export const getAllTeamsWithXp = async (): Promise<TeamInfo[]> => {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, colour, team_xp")
    .order("team_xp", { ascending: false });

  if (error) {
    console.error("Error fetching teams with XP:", error);
    throw new Error(`Failed to fetch teams with XP: ${error.message}`);
  }

  return data || [];
};

export interface TeamAchievementEntry {
  id: number;
  profile_id: number;
  team_id: number;
  source: string;
  source_id: number;
  message: string;
  xp: number;
  created_at: string;
  profile_name: string;
}

/**
 * Fetches user_achievements for a team (current month only). profile_name is resolved from profile_public (nickname).
 */
export const getTeamAchievements = async (
  teamId: number,
  limit: number = 20
): Promise<TeamAchievementEntry[]> => {
  const { from, to } = getCurrentMonthRange();
  const { data: achievements, error: achievementsError } = await supabase
    .from("user_achievements")
    .select("id, profile_id, team_id, source, source_id, message, xp, created_at")
    .eq("team_id", teamId)
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (achievementsError) {
    console.error("Error fetching team achievements:", achievementsError);
    throw new Error(`Failed to fetch team achievements: ${achievementsError.message}`);
  }

  const list = achievements ?? [];
  if (list.length === 0) return [];

  const profileIds = [...new Set(list.map((a) => a.profile_id))];
  const { data: profilesData, error: profilesError } = await supabase
    .from("profile_public")
    .select("id, nickname")
    .in("id", profileIds);

  if (profilesError) {
    console.error("Error fetching profile nicknames:", profilesError);
    throw new Error(`Failed to fetch profile nicknames: ${profilesError.message}`);
  }

  const nameByProfileId: Record<number, string> = {};
  for (const p of profilesData ?? []) {
    nameByProfileId[p.id] = p.nickname?.trim() || "Explorer";
  }

  return list.map((a) => ({
    ...a,
    profile_name: nameByProfileId[a.profile_id] ?? "Explorer",
  }));
};

/**
 * Returns total XP from user_achievements per team_id for the current month (for chart scaling).
 */
export const getTeamAchievementTotals = async (): Promise<Record<number, number>> => {
  const { from, to } = getCurrentMonthRange();
  const { data, error } = await supabase
    .from("user_achievements")
    .select("team_id, xp")
    .gte("created_at", from)
    .lte("created_at", to);

  if (error) {
    console.error("Error fetching team achievement totals:", error);
    throw new Error(`Failed to fetch team achievement totals: ${error.message}`);
  }

  const byTeam: Record<number, number> = {};
  for (const row of data ?? []) {
    byTeam[row.team_id] = (byTeam[row.team_id] ?? 0) + (row.xp ?? 0);
  }
  return byTeam;
};

/**
 * Returns total XP from user_achievements for the given profile IDs (e.g. all of a user's profiles).
 */
export const getTotalXpForProfileIds = async (
  profileIds: number[]
): Promise<number> => {
  if (profileIds.length === 0) return 0;
  const { data, error } = await supabase
    .from("user_achievements")
    .select("xp")
    .in("profile_id", profileIds);

  if (error) {
    console.error("Error fetching total XP for profiles:", error);
    return 0;
  }

  return (data ?? []).reduce((sum, row) => sum + (row.xp ?? 0), 0);
};
