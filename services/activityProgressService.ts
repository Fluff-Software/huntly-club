import { supabase } from "./supabase";

export type ActivityStatus = "not_started" | "started" | "completed";

export interface ActivityProgress {
  id: number;
  profile_id: number;
  activity_id: number;
  status: ActivityStatus;
  started_at: string | null;
  completed_at: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

export const getActivityProgress = async (
  profileId: number,
  activityId: number
): Promise<ActivityProgress | null> => {
  const { data, error } = await supabase
    .from("user_activity_progress")
    .select("*")
    .eq("profile_id", profileId)
    .eq("activity_id", activityId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching activity progress:", error);
    throw new Error(`Failed to fetch activity progress: ${error.message}`);
  }

  return data;
};

export const startActivity = async (
  profileId: number,
  activityId: number
): Promise<ActivityProgress> => {
  // First, check if a record already exists
  const { data: existingRecord } = await supabase
    .from("user_activity_progress")
    .select("*")
    .eq("profile_id", profileId)
    .eq("activity_id", activityId)
    .single();

  if (existingRecord) {
    // Update existing record if not already started
    if (existingRecord.status === "not_started") {
      const { data, error } = await supabase
        .from("user_activity_progress")
        .update({
          status: "started",
          started_at: new Date().toISOString(),
        })
        .eq("profile_id", profileId)
        .eq("activity_id", activityId)
        .select()
        .single();

      if (error) {
        console.error("Error starting activity:", error);
        throw new Error(`Failed to start activity: ${error.message}`);
      }

      return data;
    } else {
      // Already started or completed, return existing record
      return existingRecord;
    }
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from("user_activity_progress")
      .insert({
        profile_id: profileId,
        activity_id: activityId,
        status: "started",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error starting activity:", error);
      throw new Error(`Failed to start activity: ${error.message}`);
    }

    return data;
  }
};

export const completeActivity = async (
  profileId: number,
  activityId: number,
  photoUrl?: string,
  notes?: string
): Promise<ActivityProgress> => {
  // First, check if a record already exists
  const { data: existingRecord } = await supabase
    .from("user_activity_progress")
    .select("*")
    .eq("profile_id", profileId)
    .eq("activity_id", activityId)
    .single();

  if (existingRecord) {
    // Update existing record
    const { data, error } = await supabase
      .from("user_activity_progress")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        photo_url: photoUrl || null,
        notes: notes || null,
      })
      .eq("profile_id", profileId)
      .eq("activity_id", activityId)
      .select()
      .single();

    if (error) {
      console.error("Error completing activity:", error);
      throw new Error(`Failed to complete activity: ${error.message}`);
    }

    return data;
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from("user_activity_progress")
      .insert({
        profile_id: profileId,
        activity_id: activityId,
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        photo_url: photoUrl || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error completing activity:", error);
      throw new Error(`Failed to complete activity: ${error.message}`);
    }

    return data;
  }
};

export interface RecentCompletedActivity {
  id: number;
  activity_id: number;
  completed_at: string | null;
  activity: { id: number; title: string };
}

export const getRecentCompletedActivities = async (
  profileId: number,
  limit: number = 8
): Promise<RecentCompletedActivity[]> => {
  const { data, error } = await supabase
    .from("user_activity_progress")
    .select(
      `
      id,
      activity_id,
      completed_at,
      activity:activities!inner(
        id,
        title
      )
    `
    )
    .eq("profile_id", profileId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false, nullsLast: true })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent completed activities:", error);
    return [];
  }
  return (data || []) as RecentCompletedActivity[];
};

export const getActivityProgressForPack = async (
  profileId: number,
  packId: number
): Promise<ActivityProgress[]> => {
  const { data, error } = await supabase
    .from("user_activity_progress")
    .select(
      `
      *,
      activities!inner(
        id,
        pack_activities!inner(
          pack_id
        )
      )
    `
    )
    .eq("profile_id", profileId)
    .eq("activities.pack_activities.pack_id", packId);

  if (error) {
    console.error("Error fetching activity progress for pack:", error);
    throw new Error(
      `Failed to fetch activity progress for pack: ${error.message}`
    );
  }

  return data || [];
};

export const getPackCompletionPercentage = async (
  profileId: number,
  packId: number
): Promise<number> => {
  try {
    // Get all activities for this pack
    const { data: packActivities, error: packError } = await supabase
      .from("pack_activities")
      .select("activity_id")
      .eq("pack_id", packId);

    if (packError || !packActivities) {
      console.error("Error fetching pack activities:", packError);
      return 0;
    }

    if (packActivities.length === 0) {
      return 0;
    }

    // Get completion status for all activities in this pack
    const activityIds = packActivities.map((pa) => pa.activity_id);
    const { data: progressData, error: progressError } = await supabase
      .from("user_activity_progress")
      .select("activity_id, status")
      .eq("profile_id", profileId)
      .in("activity_id", activityIds);

    if (progressError) {
      console.error("Error fetching activity progress:", progressError);
      return 0;
    }

    // Calculate completion percentage
    const completedActivities =
      progressData?.filter((p) => p.status === "completed") || [];
    const completionPercentage = Math.round(
      (completedActivities.length / activityIds.length) * 100
    );

    return completionPercentage;
  } catch (error) {
    console.error("Error calculating pack completion:", error);
    return 0;
  }
};
