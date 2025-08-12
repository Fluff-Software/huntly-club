import { supabase } from "./supabase";

export interface TeamActivityLogEntry {
  id: number;
  profile_id: number;
  activity_id: number;
  status: "not_started" | "started" | "completed";
  started_at: string | null;
  completed_at: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
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
      *,
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
    .in("status", ["started", "completed"])
    .order("completed_at", { ascending: false, nullsLast: true })
    .order("started_at", { ascending: false, nullsLast: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching team activity logs:", error);
    throw new Error(`Failed to fetch team activity logs: ${error.message}`);
  }

  return data || [];
};

export const getTeamActivityLogsByStatus = async (
  teamId: number,
  status: "started" | "completed",
  limit: number = 20
): Promise<TeamActivityLogEntry[]> => {
  const { data, error } = await supabase
    .from("user_activity_progress")
    .select(
      `
      *,
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
    .eq("status", status)
    .order("completed_at", { ascending: false, nullsLast: true })
    .order("started_at", { ascending: false, nullsLast: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching team activity logs by status:", error);
    throw new Error(`Failed to fetch team activity logs: ${error.message}`);
  }

  return data || [];
};

export const getTeamInfo = async (teamId: number): Promise<TeamInfo | null> => {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, colour, team_xp")
    .eq("id", teamId)
    .single();

  if (error) {
    console.error("Error fetching team info:", error);
    throw new Error(`Failed to fetch team info: ${error.message}`);
  }

  return data;
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
