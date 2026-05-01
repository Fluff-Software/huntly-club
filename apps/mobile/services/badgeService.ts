import { supabase } from "./supabase";

export interface Badge {
  id: number;
  name: string;
  description: string;
  image_url: string;
  category: "xp" | "pack" | "team" | "special";
  requirement_value: number;
  requirement_type:
    | "xp_gained"
    | "packs_completed"
    | "activities_completed"
    | "team_xp"
    | "team_contribution" // New type for individual team contributions
    | "activities_by_category"; // New type for category-specific badges
  created_at?: string;
  requirement_category?: string;
  badge_type?: "milestone" | "manual";
  sort_group?: string;
  is_hidden_until_awarded?: boolean;
  uses_custom_image?: boolean;
}

export interface UserBadge {
  id: number;
  user_id: string;
  profile_id: number;
  badge_id: number;
  earned_at: string;
  badge: Badge;
}

export type BadgeProgressRow = {
  badge_id: number;
  name: string;
  description: string;
  image_url: string;
  category: Badge["category"];
  requirement_type: Badge["requirement_type"];
  requirement_value: number;
  requirement_category: string | null;
  badge_type: "milestone" | "manual";
  is_active: boolean;
  is_hidden_until_awarded: boolean;
  sort_group: string;
  earned: boolean;
  earned_at: string | null;
  progress_value: number;
  progress_percent: number;
};

export const getBadges = async (): Promise<Badge[]> => {
  const { data, error } = await supabase
    .from("badges")
    .select("*")
    .eq("is_active", true)
    .order("sort_group", { ascending: true });

  if (error) {
    console.error("Error fetching badges:", error);
    throw new Error(`Failed to fetch badges: ${error.message}`);
  }

  return data || [];
};

export const getUserBadges = async (
  userId: string,
  profileId?: number
): Promise<UserBadge[]> => {
  let query = supabase
    .from("user_badges")
    .select(
      `
      *,
      badge:badges(*)
    `
    )
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  // If profileId is provided, filter by profile
  if (profileId) {
    query = query.eq("profile_id", profileId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching user badges:", error);
    throw new Error(`Failed to fetch user badges: ${error.message}`);
  }

  return data || [];
};

export const checkAndAwardBadges = async (
  _userId: string,
  profileId: number,
  _xpGained: number = 0,
  _teamXpGained: number = 0
): Promise<Badge[]> => {
  try {
    const { data, error } = await supabase.rpc("evaluate_and_award_badges", {
      p_profile_id: profileId,
    });

    if (error) {
      console.error("Error evaluating badges:", error);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      id: row.badge_id,
      name: row.name,
      description: row.description,
      image_url: row.image_url,
      category: row.category,
      requirement_type: row.requirement_type,
      requirement_value: row.requirement_value,
      requirement_category: row.requirement_category,
      badge_type: row.badge_type,
      sort_group: row.sort_group,
    }));
  } catch (error) {
    console.error("Error checking badges:", error);
    return [];
  }
};

export const getBadgeProgress = async (
  _userId: string,
  profileId: number
): Promise<Record<number, number>> => {
  try {
    const rows = await getBadgeProgressRows(profileId);
    const progress: Record<number, number> = {};
    for (const row of rows) {
      progress[row.badge_id] = row.progress_percent;
    }
    return progress;
  } catch (error) {
    console.error("Error getting badge progress:", error);
    return {};
  }
};

export const getBadgeDisplay = (
  badge: Badge
): {
  type: "emoji" | "image";
  content: string;
} => {
  if (badge.image_url?.startsWith("http")) {
    return {
      type: "image",
      content: badge.image_url,
    };
  } else {
    return {
      type: "emoji",
      content: badge.image_url || "🏆",
    };
  }
};

export async function getBadgeProgressRows(
  profileId: number
): Promise<BadgeProgressRow[]> {
  const { data, error } = await supabase.rpc("get_profile_badge_progress", {
    p_profile_id: profileId,
  });

  if (error) {
    console.error("Error fetching badge progress rows:", error);
    return [];
  }

  return (data ?? []) as BadgeProgressRow[];
}
