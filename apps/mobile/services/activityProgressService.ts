import { supabase } from "./supabase";

export type ActivityStatus = "not_started" | "started" | "completed";

export interface ActivityProgressRow {
  id: number;
  profile_id: number;
  activity_id: number;
  completed_at: string | null;
  notes: string | null;
}

export interface ActivityProgress extends ActivityProgressRow {
  status: ActivityStatus;
}

function rowToProgress(row: ActivityProgressRow | null): ActivityProgress | null {
  if (!row) return null;
  const status: ActivityStatus = row.completed_at != null ? "completed" : "started";
  return { ...row, status };
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

  return rowToProgress(data);
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
    return rowToProgress(existingRecord)!;
  }

  const { data, error } = await supabase
    .from("user_activity_progress")
    .insert({
      profile_id: profileId,
      activity_id: activityId,
      completed_at: null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error starting activity:", error);
    throw new Error(`Failed to start activity: ${error.message}`);
  }

  return rowToProgress(data)!;
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
    const { data, error } = await supabase
      .from("user_activity_progress")
      .update({
        completed_at: new Date().toISOString(),
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

    return rowToProgress(data)!;
  }

  const { data, error } = await supabase
    .from("user_activity_progress")
    .insert({
      profile_id: profileId,
      activity_id: activityId,
      completed_at: new Date().toISOString(),
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error completing activity:", error);
    throw new Error(`Failed to complete activity: ${error.message}`);
  }

  return rowToProgress(data)!;
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
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent completed activities:", error);
    return [];
  }
  const rows = data ?? [];
  return rows.map((row) => {
    const activity = Array.isArray(row.activity) ? row.activity[0] : row.activity;
    return { id: row.id, activity_id: row.activity_id, completed_at: row.completed_at, activity: activity ?? { id: 0, title: "" } };
  }) as RecentCompletedActivity[];
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

  return (data || []).map((row) => rowToProgress(row)!);
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
      .select("activity_id, completed_at")
      .eq("profile_id", profileId)
      .in("activity_id", activityIds);

    if (progressError) {
      console.error("Error fetching activity progress:", progressError);
      return 0;
    }

    const completedActivities =
      progressData?.filter((p) => p.completed_at != null) || [];
    const completionPercentage = Math.round(
      (completedActivities.length / activityIds.length) * 100
    );

    return completionPercentage;
  } catch (error) {
    console.error("Error calculating pack completion:", error);
    return 0;
  }
};

export interface EnsureProgressRowsResult {
  progressIdByProfile: Record<number, number>;
  /** Rows that were newly created (use to e.g. insert user_achievements). */
  inserted: { id: number; profile_id: number }[];
}

/**
 * Ensures user_activity_progress rows exist for each profile and activity.
 * Creates missing rows (profile_id, activity_id) and returns a map of profile_id -> progress id
 * plus the list of newly inserted rows.
 */
export const ensureProgressRows = async (
  profileIds: number[],
  activityId: number
): Promise<EnsureProgressRowsResult> => {
  const empty: EnsureProgressRowsResult = { progressIdByProfile: {}, inserted: [] };
  if (profileIds.length === 0) return empty;

  const { data: existing, error: selectError } = await supabase
    .from("user_activity_progress")
    .select("id, profile_id")
    .eq("activity_id", activityId)
    .in("profile_id", profileIds);

  if (selectError) {
    console.error("Error fetching activity progress:", selectError);
    throw new Error(`Failed to fetch activity progress: ${selectError.message}`);
  }

  const progressIdByProfile: Record<number, number> = {};
  for (const row of existing ?? []) {
    progressIdByProfile[row.profile_id] = row.id;
  }

  const missingProfileIds = profileIds.filter((id) => progressIdByProfile[id] == null);
  if (missingProfileIds.length === 0) {
    return { progressIdByProfile, inserted: [] };
  }

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

  const insertedRows = inserted ?? [];
  for (const row of insertedRows) {
    progressIdByProfile[row.profile_id] = row.id;
  }

  return {
    progressIdByProfile,
    inserted: insertedRows,
  };
};

export interface UserAchievementInsert {
  profile_id: number;
  team_id: number;
  source_id: number;
  xp: number;
}

/**
 * Inserts user_achievements rows for newly created user_activity_progress (e.g. mission completion).
 * source is "mission", message is "completed a mission".
 */
export const insertUserAchievementsForMission = async (
  rows: UserAchievementInsert[]
): Promise<void> => {
  if (rows.length === 0) return;

  const { error } = await supabase.from("user_achievements").insert(
    rows.map((r) => ({
      profile_id: r.profile_id,
      team_id: r.team_id,
      source: "mission",
      source_id: r.source_id,
      message: "completed a mission",
      xp: r.xp,
    }))
  );

  if (error) {
    console.error("Error inserting user achievements:", error);
    throw new Error(`Failed to insert user achievements: ${error.message}`);
  }
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
 * status 1 = approved. Nicknames come from profile_public (id + nickname only).
 * Pass excludeIds when loading more to avoid duplicates.
 */
export const getRandomClubPhotos = async (
  count: number,
  excludeIds: string[] = []
): Promise<ClubPhotoCardItem[]> => {
  const { data, error } = await supabase
    .from("user_activity_photos")
    .select("photo_id, photo_url, profile_id, activities(title)")
    .eq("status", 1)
    .not("activity_id", "is", null);

  if (error) {
    console.error("Error fetching club photos:", error);
    throw new Error(`Failed to fetch club photos: ${error.message}`);
  }

  const list = data ?? [];
  if (list.length === 0) return [];

  const excludeSet = new Set(excludeIds);
  const profileIds = [...new Set((list as { profile_id?: number }[]).map((r) => r.profile_id).filter((id): id is number => id != null))];
  const nicknamesByProfileId: Record<number, string> = {};
  if (profileIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profile_public")
      .select("id, nickname")
      .in("id", profileIds);
    for (const p of profilesData ?? []) {
      nicknamesByProfileId[p.id] = p.nickname ?? "";
    }
  }

  const shuffled = [...list].sort(() => Math.random() - 0.5);
  const filtered = excludeSet.size > 0
    ? shuffled.filter((row: Record<string, unknown>) => !excludeSet.has(String(row.photo_id ?? "")))
    : shuffled;
  const taken = filtered.slice(0, count);

  return taken.map((row: Record<string, unknown>) => {
    const activity = row.activities;
    const title = Array.isArray(activity) ? activity[0]?.title : (activity as { title?: string } | null)?.title;
    const profileId = row.profile_id as number | undefined;
    const nickname = profileId != null ? nicknamesByProfileId[profileId] ?? "" : "";
    return {
      id: String(row.photo_id ?? Math.random()),
      photo_url: String(row.photo_url ?? ""),
      title: typeof title === "string" ? title : "",
      author: typeof nickname === "string" ? nickname : "",
    };
  });
};
