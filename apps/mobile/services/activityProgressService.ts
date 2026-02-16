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

/**
 * Ensures user_activity_progress rows exist for each profile and activity.
 * Creates missing rows (profile_id, activity_id) and returns a map of profile_id -> progress id.
 */
export const ensureProgressRows = async (
  profileIds: number[],
  activityId: number
): Promise<Record<number, number>> => {
  if (profileIds.length === 0) return {};

  const { data: existing, error: selectError } = await supabase
    .from("user_activity_progress")
    .select("id, profile_id")
    .eq("activity_id", activityId)
    .in("profile_id", profileIds);

  if (selectError) {
    console.error("Error fetching activity progress:", selectError);
    throw new Error(`Failed to fetch activity progress: ${selectError.message}`);
  }

  const result: Record<number, number> = {};
  for (const row of existing ?? []) {
    result[row.profile_id] = row.id;
  }

  const missingProfileIds = profileIds.filter((id) => result[id] == null);
  if (missingProfileIds.length === 0) return result;

  const inserts = missingProfileIds.map((profile_id) => ({
    profile_id,
    activity_id: activityId,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("user_activity_progress")
    .insert(inserts)
    .select("id, profile_id");

  if (insertError) {
    console.error("Error creating activity progress:", insertError);
    throw new Error(`Failed to create activity progress: ${insertError.message}`);
  }

  for (const row of inserted ?? []) {
    result[row.profile_id] = row.id;
  }
  return result;
};

export interface UserActivityPhotoInsert {
  profile_id: number;
  user_activity_id: number;
  activity_id: number;
  photo_url: string;
}

/**
 * Inserts user_activity_photos rows (status 0 = for review).
 */
export const insertUserActivityPhotos = async (
  rows: UserActivityPhotoInsert[]
): Promise<void> => {
  if (rows.length === 0) return;

  const { error } = await supabase.from("user_activity_photos").insert(
    rows.map((r) => ({
      profile_id: r.profile_id,
      user_activity_id: r.user_activity_id,
      activity_id: r.activity_id,
      photo_url: r.photo_url,
      status: 0,
    }))
  );

  if (error) {
    console.error("Error inserting activity photos:", error);
    throw new Error(`Failed to insert activity photos: ${error.message}`);
  }
};

export interface ActivityPhotoItem {
  photo_url: string;
}

/**
 * Returns up to `count` random approved photos for the given activity.
 * status 1 = approved. If fewer than count exist, returns all available.
 */
export const getRandomActivityPhotos = async (
  count: number,
  activityId: number
): Promise<ActivityPhotoItem[]> => {
  const { data, error } = await supabase
    .from("user_activity_photos")
    .select("photo_url")
    .eq("activity_id", activityId)
    .eq("status", 1);

  if (error) {
    console.error("Error fetching activity photos:", error);
    throw new Error(`Failed to fetch activity photos: ${error.message}`);
  }

  const list = data ?? [];
  if (list.length === 0) return [];

  // Shuffle and take up to `count`
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export interface ClubPhotoCardItem {
  id: string;
  photo_url: string;
  title: string;
  author: string;
}

/**
 * Returns up to `count` random approved photos from the club (any activity).
 * Each item includes activity title and profile nickname for display.
 * status 1 = approved.
 */
export const getRandomClubPhotos = async (
  count: number
): Promise<ClubPhotoCardItem[]> => {
  const { data, error } = await supabase
    .from("user_activity_photos")
    .select("photo_id, photo_url, activities(title), profiles(nickname)")
    .eq("status", 1)
    .not("activity_id", "is", null);

  if (error) {
    console.error("Error fetching club photos:", error);
    throw new Error(`Failed to fetch club photos: ${error.message}`);
  }

  const list = data ?? [];
  if (list.length === 0) return [];

  const shuffled = [...list].sort(() => Math.random() - 0.5);
  const taken = shuffled.slice(0, count);

  return taken.map((row: Record<string, unknown>) => {
    const activity = row.activities;
    const profile = row.profiles;
    const title = Array.isArray(activity) ? activity[0]?.title : (activity as { title?: string } | null)?.title;
    const nickname = Array.isArray(profile) ? profile[0]?.nickname : (profile as { nickname?: string | null } | null)?.nickname;
    return {
      id: String(row.photo_id ?? Math.random()),
      photo_url: String(row.photo_url ?? ""),
      title: typeof title === "string" ? title : "",
      author: typeof nickname === "string" ? nickname : "",
    };
  });
};
