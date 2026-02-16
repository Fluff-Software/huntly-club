import { supabase } from "./supabase";

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
