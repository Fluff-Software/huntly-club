import { supabase } from "./supabase";
import { Activity } from "@/types/activity";
import { checkAndAwardBadges } from "./badgeService";

export const completeActivity = async (
  activityId: number,
  profileId: number
): Promise<{
  success: boolean;
  xpGained: number;
  teamXpGained: number;
  newBadges: any[];
}> => {
  try {
    // Get the activity to know how much XP to award
    const { data: activity, error: activityError } = await supabase
      .from("activities")
      .select("xp")
      .eq("id", activityId)
      .single();

    if (activityError || !activity) {
      throw new Error("Activity not found");
    }

    // Get the profile to know which team they belong to
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("xp, team, user_id, team_contribution")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    const newXp = (profile.xp || 0) + activity.xp;
    const teamXpGained = Math.floor(activity.xp * 0.5); // Team gets 50% of individual XP
    const newTeamContribution = (profile.team_contribution || 0) + teamXpGained;

    // Update the profile's XP and team contribution
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        xp: newXp,
        team_contribution: newTeamContribution,
      })
      .eq("id", profileId);

    if (updateProfileError) {
      throw new Error("Failed to update profile XP");
    }

    // Add XP to the team
    const { error: teamXpError } = await supabase.rpc("add_team_xp", {
      team_id: profile.team,
      xp_amount: teamXpGained,
    });

    if (teamXpError) {
      console.error("Failed to update team XP:", teamXpError);
      // Don't fail the entire operation if team XP update fails
    }

    // Check for new badges
    const newBadges = await checkAndAwardBadges(
      profile.user_id,
      profileId,
      activity.xp,
      teamXpGained
    );

    console.log(`Badge check result for profile ${profileId}:`, {
      newBadges: newBadges.length,
      badges: newBadges.map((b) => b.name),
    });

    return {
      success: true,
      xpGained: activity.xp,
      teamXpGained: teamXpGained,
      newBadges: newBadges,
    };
  } catch (error) {
    console.error("Error completing activity:", error);
    throw error;
  }
};

export const getActivityById = async (
  activityId: number
): Promise<Activity | null> => {
  const { data, error } = await supabase
    .from("activities")
    .select("id, name, title, description, image, xp, categories")
    .eq("id", activityId)
    .single();

  if (error) {
    console.error("Error fetching activity:", error);
    throw error;
  }

  return data;
};
