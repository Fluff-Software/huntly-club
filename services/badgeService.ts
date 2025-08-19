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
  created_at: string;
  local_image_path?: string; // Added for local development
  uses_custom_image?: boolean; // Added for custom image usage
  requirement_category?: string; // For category-specific badges
}

export interface UserBadge {
  id: number;
  user_id: string;
  profile_id: number; // Add profile_id to track which profile earned the badge
  badge_id: number;
  earned_at: string;
  badge: Badge;
}

// Badge definitions
export const BADGE_DEFINITIONS: Omit<Badge, "id" | "created_at">[] = [
  {
    name: "First Steps",
    description: "Complete your first activity and earn your first XP!",
    image_url: "🏃‍♂️",
    category: "xp",
    requirement_value: 1,
    requirement_type: "xp_gained",
  },
  {
    name: "Explorer",
    description: "Earn 50 XP through completing activities",
    image_url: "🗺️",
    category: "xp",
    requirement_value: 50,
    requirement_type: "xp_gained",
  },
  {
    name: "Adventure Master",
    description: "Earn 100 XP through completing activities",
    image_url: "🏆",
    category: "xp",
    requirement_value: 100,
    requirement_type: "xp_gained",
  },
  {
    name: "Pack Pioneer",
    description: "Complete your first pack of activities",
    image_url: "📦",
    category: "pack",
    requirement_value: 1,
    requirement_type: "packs_completed",
  },
  {
    name: "Team Player",
    description: "Contribute 25 XP to your team",
    image_url: "👥",
    category: "team",
    requirement_value: 25,
    requirement_type: "team_xp",
  },
  {
    name: "Nature Enthusiast",
    description: "Complete 10 nature-related activities",
    image_url: "🌿",
    category: "special",
    requirement_value: 10,
    requirement_type: "activities_completed",
  },
  // New category-specific badges
  {
    name: "Bird Watcher",
    description: "Complete 5 bird spotting activities",
    image_url: "🐦",
    category: "special",
    requirement_value: 5,
    requirement_type: "activities_by_category",
    requirement_category: "bird",
  },
  {
    name: "Photography Pro",
    description: "Complete 8 photography activities",
    image_url: "📸",
    category: "special",
    requirement_value: 8,
    requirement_type: "activities_by_category",
    requirement_category: "photography",
  },
  {
    name: "Outdoor Explorer",
    description: "Complete 6 outdoor exploration activities",
    image_url: "🏕️",
    category: "special",
    requirement_value: 6,
    requirement_type: "activities_by_category",
    requirement_category: "outdoor",
  },
];

export const getBadges = async (): Promise<Badge[]> => {
  const { data, error } = await supabase
    .from("badges")
    .select("*")
    .order("requirement_value", { ascending: true });

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
  userId: string,
  profileId: number,
  xpGained: number = 0,
  teamXpGained: number = 0
): Promise<Badge[]> => {
  try {
    // Get current user stats
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp, team, team_contribution")
      .eq("id", profileId)
      .single();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Get profile's existing badges
    const existingBadges = await getUserBadges(userId, profileId);
    const existingBadgeIds = new Set(existingBadges.map((ub) => ub.badge_id));

    // Get all available badges
    const allBadges = await getBadges();
    const newBadges: Badge[] = [];

    // Check each badge requirement
    for (const badge of allBadges) {
      if (existingBadgeIds.has(badge.id)) {
        continue; // Already earned
      }

      let shouldAward = false;

      switch (badge.requirement_type) {
        case "xp_gained":
          if (profile.xp >= badge.requirement_value) {
            shouldAward = true;
          }
          break;

        case "team_xp":
          // Get team XP
          const { data: team } = await supabase
            .from("teams")
            .select("team_xp")
            .eq("id", profile.team)
            .single();

          if (team && team.team_xp >= badge.requirement_value) {
            shouldAward = true;
          }
          break;

        case "team_contribution":
          // Check individual contribution to team XP
          if ((profile.team_contribution || 0) >= badge.requirement_value) {
            shouldAward = true;
          }
          break;

        case "packs_completed":
          // Count completed packs (distinct packs, not activities)
          const { data: packProgress } = await supabase
            .from("user_activity_progress")
            .select(
              `
              activity_id, 
              status,
              activity:activities(pack_id)
            `
            )
            .eq("profile_id", profileId)
            .eq("status", "completed");

          if (packProgress) {
            // Get unique pack IDs that have been completed
            const completedPackIds = new Set(
              packProgress
                .map((p: any) => p.activity?.pack_id)
                .filter((id: any) => id !== null && id !== undefined)
            );

            if (completedPackIds.size >= badge.requirement_value) {
              shouldAward = true;
            }
          }
          break;

        case "activities_completed":
          const { data: activities } = await supabase
            .from("user_activity_progress")
            .select("status")
            .eq("profile_id", profileId)
            .eq("status", "completed");

          if (activities && activities.length >= badge.requirement_value) {
            shouldAward = true;
          }
          break;

        case "activities_by_category":
          // Count completed activities by category
          const { data: categoryActivities } = await supabase
            .from("user_activity_progress")
            .select(
              `
              status,
              activity:activities(title)
            `
            )
            .eq("profile_id", profileId)
            .eq("status", "completed");

          if (categoryActivities && badge.requirement_category) {
            const categoryCount = categoryActivities.filter((item: any) => {
              const title = item.activity?.title?.toLowerCase() || "";
              const category = badge.requirement_category?.toLowerCase() || "";

              // Check if activity title contains the category keyword
              return title.includes(category);
            }).length;

            if (categoryCount >= badge.requirement_value) {
              shouldAward = true;
            }
          }
          break;
      }

      if (shouldAward) {
        // Award the badge to the specific profile
        const { error: awardError } = await supabase
          .from("user_badges")
          .insert({
            user_id: userId,
            profile_id: profileId,
            badge_id: badge.id,
            earned_at: new Date().toISOString(),
          });

        if (!awardError) {
          newBadges.push(badge);
          // Add to existing badges set to prevent duplicate awards in this session
          existingBadgeIds.add(badge.id);
        }
      }
    }

    return newBadges;
  } catch (error) {
    console.error("Error checking badges:", error);
    return [];
  }
};

export const getBadgeProgress = async (
  userId: string,
  profileId: number
): Promise<Record<number, number>> => {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp, team")
      .eq("id", profileId)
      .single();

    if (!profile) {
      return {};
    }

    const allBadges = await getBadges();
    const progress: Record<number, number> = {};

    for (const badge of allBadges) {
      let currentValue = 0;

      switch (badge.requirement_type) {
        case "xp_gained":
          currentValue = profile.xp;
          break;

        case "team_xp":
          const { data: team } = await supabase
            .from("teams")
            .select("team_xp")
            .eq("id", profile.team)
            .single();
          currentValue = team?.team_xp || 0;
          break;

        case "activities_completed":
          const { data: activities } = await supabase
            .from("user_activity_progress")
            .select("status")
            .eq("profile_id", profileId)
            .eq("status", "completed");
          currentValue = activities?.length || 0;
          break;

        case "packs_completed":
          const { data: packProgress } = await supabase
            .from("user_activity_progress")
            .select("activity_id, status")
            .eq("profile_id", profileId)
            .eq("status", "completed");
          currentValue = packProgress?.length || 0;
          break;
      }

      progress[badge.id] = Math.min(
        (currentValue / badge.requirement_value) * 100,
        100
      );
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
  // Check for local image path first (for development)
  if (badge.local_image_path) {
    return {
      type: "image",
      content: badge.local_image_path,
    };
  }

  // Then check for custom image from storage
  if (badge.uses_custom_image && badge.image_url) {
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
