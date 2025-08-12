import { supabase } from "./supabase";
import { Activity } from "./packService";

export const completeActivity = async (
  activityId: number,
  profileId: number
): Promise<{ success: boolean; xpGained: number; teamXpGained: number }> => {
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
      .select("xp, team")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    const newXp = (profile.xp || 0) + activity.xp;
    const teamXpGained = Math.floor(activity.xp * 0.5); // Team gets 50% of individual XP

    // Update the profile's XP
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ xp: newXp })
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

    return {
      success: true,
      xpGained: activity.xp,
      teamXpGained: teamXpGained,
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
    .select("id, name, title, description, image, xp")
    .eq("id", activityId)
    .single();

  if (error) {
    console.error("Error fetching activity:", error);
    throw error;
  }

  return data;
};
