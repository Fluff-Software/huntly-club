import { supabase } from "./supabase";
import { Activity } from "./packService";

export const completeActivity = async (
  activityId: number,
  profileId: number
): Promise<{ success: boolean; xpGained: number }> => {
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

    // Update the profile's XP
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("xp")
      .eq("id", profileId)
      .single();

    if (profileError) {
      throw new Error("Profile not found");
    }

    const newXp = (profile?.xp || 0) + activity.xp;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ xp: newXp })
      .eq("id", profileId);

    if (updateError) {
      throw new Error("Failed to update XP");
    }

    return {
      success: true,
      xpGained: activity.xp,
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
