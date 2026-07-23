import { supabase } from "./supabase";
import { ukTodayForChapterUnlockGate } from "@/utils/ukChapterTime";

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
  /** Rows that already existed but had not yet been completed (completed_at was null). */
  existingIncomplete: { id: number; profile_id: number }[];
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
  const empty: EnsureProgressRowsResult = { progressIdByProfile: {}, inserted: [], existingIncomplete: [] };
  if (profileIds.length === 0) return empty;

  const { data: existing, error: selectError } = await supabase
    .from("user_activity_progress")
    .select("id, profile_id, completed_at")
    .eq("activity_id", activityId)
    .in("profile_id", profileIds);

  if (selectError) {
    console.error("Error fetching activity progress:", selectError);
    throw new Error(`Failed to fetch activity progress: ${selectError.message}`);
  }

  const progressIdByProfile: Record<number, number> = {};
  const existingIncomplete: { id: number; profile_id: number }[] = [];
  for (const row of existing ?? []) {
    progressIdByProfile[row.profile_id] = row.id;
    if (row.completed_at == null) {
      existingIncomplete.push({ id: row.id, profile_id: row.profile_id });
    }
  }

  const missingProfileIds = profileIds.filter((id) => progressIdByProfile[id] == null);
  if (missingProfileIds.length === 0) {
    return { progressIdByProfile, inserted: [], existingIncomplete };
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
    existingIncomplete,
  };
};

/**
 * Updates user_activity_progress rows with debrief answers (e.g. base name, trickiest part).
 */
export const updateProgressDebrief = async (
  progressIds: number[],
  debriefAnswer1: string | null,
  debriefAnswer2: string | null
): Promise<void> => {
  if (progressIds.length === 0) return;
  const { error } = await supabase
    .from("user_activity_progress")
    .update({
      debrief_answer_1: debriefAnswer1 || null,
      debrief_answer_2: debriefAnswer2 || null,
    })
    .in("id", progressIds);
  if (error) {
    console.error("Error updating progress debrief:", error);
    throw new Error(`Failed to save debrief: ${error.message}`);
  }
};

/**
 * Marks user_activity_progress rows as completed by setting completed_at.
 */
export const completeProgressRows = async (progressIds: number[]): Promise<void> => {
  if (progressIds.length === 0) return;
  const { error } = await supabase
    .from("user_activity_progress")
    .update({ completed_at: new Date().toISOString() })
    .in("id", progressIds)
    .is("completed_at", null);
  if (error) {
    console.error("Error completing progress rows:", error);
    throw new Error(`Failed to complete progress rows: ${error.message}`);
  }
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

export const TUTORIAL_ACHIEVEMENT_XP = 5;

/**
 * Returns true if the profile has already completed the tutorial (has a "tutorial" achievement).
 */
export const getHasCompletedTutorial = async (profileId: number): Promise<boolean> => {
  const { data, error } = await supabase
    .from("user_achievements")
    .select("id")
    .eq("profile_id", profileId)
    .eq("source", "tutorial")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error checking tutorial achievement:", error);
    return false;
  }
  return data != null;
};

/**
 * Records a "completed the tutorial" achievement for the profile, once per profile.
 * @returns true if a new achievement was inserted, false if they already had it.
 */
export const recordTutorialAchievement = async (
  profileId: number,
  teamId: number
): Promise<boolean> => {
  const { data: existing } = await supabase
    .from("user_achievements")
    .select("id")
    .eq("profile_id", profileId)
    .eq("source", "tutorial")
    .limit(1)
    .maybeSingle();

  if (existing) return false;

  const { error } = await supabase.from("user_achievements").insert({
    profile_id: profileId,
    team_id: teamId,
    source: "tutorial",
    source_id: 0,
    message: "completed the tutorial",
    xp: TUTORIAL_ACHIEVEMENT_XP,
  });

  if (error) {
    console.error("Error recording tutorial achievement:", error);
    return false;
  }
  return true;
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

  // Best-effort: notify admins that new photos are waiting for review.
  try {
    await supabase.functions.invoke("photo-review-admin-email", {
      body: {
        photoCount: rows.length,
        activityId: rows[0]?.activity_id ?? null,
      },
    });
  } catch (notifyError) {
    console.error("Error notifying admins about review photos:", notifyError);
  }
};

export interface ActivityPhotoItem {
  photo_url: string;
}

/**
 * Returns up to `count` random approved photos for the given activity.
 * status 1 = approved. Includes temporary submission photos.
 * If fewer than count exist, returns all available.
 */
export const getRandomActivityPhotos = async (
  count: number,
  activityId: number
): Promise<ActivityPhotoItem[]> => {
  const [realResult, tempResult] = await Promise.all([
    supabase
      .from("user_activity_photos")
      .select("photo_url")
      .eq("activity_id", activityId)
      .eq("status", 1),
    supabase
      .from("temporary_submissions")
      .select("temporary_submission_photos(photo_url)")
      .eq("activity_id", activityId),
  ]);

  if (realResult.error) {
    console.error("Error fetching activity photos:", realResult.error);
    throw new Error(`Failed to fetch activity photos: ${realResult.error.message}`);
  }

  const list: ActivityPhotoItem[] = (realResult.data ?? [])
    .map((r) => ({ photo_url: r.photo_url as string }))
    .filter((r) => !!r.photo_url);

  for (const row of tempResult.data ?? []) {
    const photos = row.temporary_submission_photos as
      | { photo_url: string }[]
      | { photo_url: string }
      | null;
    const arr = Array.isArray(photos) ? photos : photos ? [photos] : [];
    for (const p of arr) {
      if (p?.photo_url) list.push({ photo_url: p.photo_url });
    }
  }

  if (list.length === 0) return [];

  const shuffled = [...list].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

function buildNotInFilter(values: number[]): string | null {
  if (values.length === 0) return null;
  // PostgREST expects: "(1,2,3)"
  return `(${values.join(",")})`;
}

async function hasTemporarySubmissionsForActivity(
  activityId: number
): Promise<boolean> {
  const { count, error } = await supabase
    .from("temporary_submissions")
    .select("id", { head: true, count: "exact" })
    .eq("activity_id", activityId)
    .limit(1);
  if (error) {
    console.error("Error checking temporary submissions:", error);
    return false;
  }
  return (count ?? 0) > 0;
}

export const hasOtherApprovedMissionPhotos = async (
  activityId: number,
  excludeProfileIds: number[]
): Promise<boolean> => {
  if (await hasTemporarySubmissionsForActivity(activityId)) return true;

  // If we don't know who "self" is yet, do not risk showing the button based on our own photos.
  if (excludeProfileIds.length === 0) return false;

  let query = supabase
    .from("user_activity_photos")
    .select("photo_id", { head: true, count: "exact" })
    .eq("activity_id", activityId)
    .eq("status", 1)
    .limit(1);

  const notIn = buildNotInFilter(excludeProfileIds);
  if (notIn) {
    query = query.not("profile_id", "in", notIn);
  }

  const { count, error } = await query;
  if (error) {
    console.error("Error checking other approved mission photos:", error);
    return false;
  }
  return (count ?? 0) > 0;
};

export type MissionPhotoGroup = {
  user_activity_id: number;
  profile_id: number;
  photos: string[];
  author?: string;
  team_name?: string;
};

export const getRandomMissionPhotoGroups = async (
  activityId: number,
  excludeProfileIds: number[],
  groupCount: number = 3
): Promise<MissionPhotoGroup[]> => {
  let query = supabase
    .from("user_activity_photos")
    .select("user_activity_id, profile_id, photo_url")
    .eq("activity_id", activityId)
    .eq("status", 1)
    .not("user_activity_id", "is", null);

  const notIn = buildNotInFilter(excludeProfileIds);
  if (notIn) {
    query = query.not("profile_id", "in", notIn);
  }

  const [realResult, tempResult] = await Promise.all([
    query,
    supabase
      .from("temporary_submissions")
      .select(
        `
        id,
        display_name,
        teams(name),
        temporary_submission_photos(photo_url, sort_order)
      `
      )
      .eq("activity_id", activityId),
  ]);

  if (realResult.error) {
    console.error("Error fetching mission photo groups:", realResult.error);
    throw new Error(
      `Failed to fetch mission photo groups: ${realResult.error.message}`
    );
  }

  const rows = (realResult.data ?? []) as Array<{
    user_activity_id: number | null;
    profile_id: number | null;
    photo_url: string | null;
  }>;

  const byProgressId = new Map<number, MissionPhotoGroup>();
  for (const r of rows) {
    const progressId = r.user_activity_id ?? null;
    const profileId = r.profile_id ?? null;
    const url = r.photo_url ?? "";
    if (!progressId || !profileId || !url) continue;

    const existing = byProgressId.get(progressId);
    if (existing) {
      existing.photos.push(url);
      continue;
    }
    byProgressId.set(progressId, {
      user_activity_id: progressId,
      profile_id: profileId,
      photos: [url],
    });
  }

  const groups = [...byProgressId.values()].filter((g) => g.photos.length > 0);

  // Best-effort: attach public nickname + team for display (no RLS).
  const profileIds = [...new Set(groups.map((g) => g.profile_id))];
  if (profileIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profile_public")
      .select("id, nickname, team_name")
      .in("id", profileIds);

    const nickById: Record<number, string> = {};
    const teamById: Record<number, string> = {};
    for (const p of profilesData ?? []) {
      nickById[p.id] = (p.nickname ?? "").trim();
      teamById[p.id] = ((p.team_name as string | null) ?? "").toLowerCase();
    }

    for (const g of groups) {
      const nick = nickById[g.profile_id];
      const team = teamById[g.profile_id];
      if (nick) g.author = nick;
      if (team) g.team_name = team;
    }
  }

  for (const row of tempResult.data ?? []) {
    const photosRaw = row.temporary_submission_photos as
      | { photo_url: string; sort_order: number }[]
      | null;
    const photos = [...(photosRaw ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => p.photo_url)
      .filter(Boolean);
    if (photos.length === 0) continue;

    const teamRow = row.teams as { name: string } | { name: string }[] | null;
    const teamName = Array.isArray(teamRow) ? teamRow[0]?.name : teamRow?.name;

    groups.push({
      user_activity_id: -Number(row.id),
      profile_id: -Number(row.id),
      photos,
      author: (row.display_name as string)?.trim() || "Explorer",
      team_name: teamName ? teamName.toLowerCase() : undefined,
    });
  }

  if (groups.length === 0) return [];

  const shuffled = [...groups].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(0, groupCount));
};

export interface ClubPhotoCardItem {
  id: string;
  /** Thumbnail-sized URL optimised for cards. */
  thumb_url: string;
  /** Original or larger image URL. */
  photo_url: string;
  title: string;
  author: string;
  /** Lowercase team name for badge display ("bears", "foxes", "otters"). */
  team_name?: string;
}

/**
 * Returns a weighted random ordering where higher recency scores are favored,
 * but lower scores still have a non-zero chance to appear.
 */
function weightedRecencyShuffleByScore<T>(
  rows: T[],
  getRecencyScore: (row: T) => number
): T[] {
  const MIN_WEIGHT = 0.1; // keep older content occasionally visible

  const scored = rows.map((row) => ({
    row,
    score: Number.isFinite(getRecencyScore(row)) ? getRecencyScore(row) : 0,
  }));
  const maxScore = scored.reduce((max, item) => Math.max(max, item.score), 0);

  return scored
    .map((item) => {
      const normalized = maxScore > 0 ? item.score / maxScore : 0;
      const recencyWeight = MIN_WEIGHT + normalized;
      // Efraimidis-Spirakis weighted random key for sampling without replacement.
      const key = Math.pow(Math.random(), 1 / recencyWeight);
      return { row: item.row, key };
    })
    .sort((a, b) => b.key - a.key)
    .map((item) => item.row);
}

function buildThumbnailUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;
  // Append basic resize/quality params; for Supabase Storage this will
  // request a resized variant, and for other providers it degrades to
  // a cached full-size URL with harmless query params.
  const separator = originalUrl.includes("?") ? "&" : "?";
  const params = "width=600&quality=75&resize=cover";
  return `${originalUrl}${separator}${params}`;
}

function mapClubPhotoRows(
  rows: {
    photo_id: number | string;
    photo_url: string;
    activity_title?: string;
    nickname?: string;
    team_name?: string;
  }[]
): ClubPhotoCardItem[] {
  return rows.map((row) => {
    const photoUrl = String(row.photo_url ?? "");
    const teamName = row.team_name?.trim();
    return {
      id: String(row.photo_id),
      thumb_url: buildThumbnailUrl(photoUrl),
      photo_url: photoUrl,
      title: row.activity_title ?? "",
      author: row.nickname ?? "",
      team_name: teamName ? teamName : undefined,
    };
  });
}

/** Client fallback when get_random_club_photos RPC is unavailable. */
async function getRandomClubPhotosFallback(
  count: number,
  excludeIds: string[]
): Promise<ClubPhotoCardItem[]> {
  const poolSize = Math.max(count * 12, 72);
  const [realResult, tempResult] = await Promise.all([
    supabase
      .from("user_activity_photos")
      .select("photo_id, photo_url, profile_id, activities(title)")
      .eq("status", 1)
      .not("activity_id", "is", null)
      .order("photo_id", { ascending: false })
      .limit(poolSize),
    supabase
      .from("temporary_submission_photos")
      .select(
        `
        id,
        photo_url,
        temporary_submissions(
          display_name,
          activities(title),
          teams(name)
        )
      `
      )
      .order("id", { ascending: false })
      .limit(poolSize),
  ]);

  if (realResult.error) {
    console.error("Error fetching club photos (fallback):", realResult.error);
    throw new Error(`Failed to fetch club photos: ${realResult.error.message}`);
  }

  type PoolRow = {
    photo_id: number;
    photo_url: string;
    score: number;
    title: string;
    author: string;
    team_name?: string;
  };

  const excludeSet = new Set(excludeIds);
  const pool: PoolRow[] = [];

  const list = realResult.data ?? [];
  const profileIds = [
    ...new Set(
      (list as { profile_id?: number }[])
        .map((r) => r.profile_id)
        .filter((id): id is number => id != null)
    ),
  ];
  const nicknamesByProfileId: Record<number, string> = {};
  const teamNameByProfileId: Record<number, string> = {};
  if (profileIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profile_public")
      .select("id, nickname, team_name")
      .in("id", profileIds);
    for (const p of profilesData ?? []) {
      nicknamesByProfileId[p.id] = p.nickname ?? "";
      teamNameByProfileId[p.id] = (p.team_name as string | null)?.toLowerCase() ?? "";
    }
  }

  for (const row of list as Record<string, unknown>[]) {
    const photoId = Number(row.photo_id);
    if (excludeSet.has(String(photoId))) continue;
    const activity = row.activities;
    const title = Array.isArray(activity)
      ? activity[0]?.title
      : (activity as { title?: string } | null)?.title;
    const profileId = row.profile_id as number | undefined;
    pool.push({
      photo_id: photoId,
      photo_url: String(row.photo_url ?? ""),
      score: photoId,
      title: typeof title === "string" ? title : "",
      author: profileId != null ? nicknamesByProfileId[profileId] ?? "" : "",
      team_name:
        profileId != null ? teamNameByProfileId[profileId] || undefined : undefined,
    });
  }

  for (const row of tempResult.data ?? []) {
    const photoId = -Number(row.id);
    if (excludeSet.has(String(photoId))) continue;
    const submission = row.temporary_submissions as
      | {
          display_name?: string;
          activities?: { title?: string } | { title?: string }[] | null;
          teams?: { name?: string } | { name?: string }[] | null;
        }
      | {
          display_name?: string;
          activities?: { title?: string } | { title?: string }[] | null;
          teams?: { name?: string } | { name?: string }[] | null;
        }[]
      | null;
    const sub = Array.isArray(submission) ? submission[0] : submission;
    const activity = sub?.activities;
    const title = Array.isArray(activity)
      ? activity[0]?.title
      : activity?.title;
    const team = sub?.teams;
    const teamName = Array.isArray(team) ? team[0]?.name : team?.name;
    pool.push({
      photo_id: photoId,
      photo_url: String(row.photo_url ?? ""),
      score: Math.abs(photoId),
      title: typeof title === "string" ? title : "",
      author: (sub?.display_name ?? "").trim(),
      team_name: teamName ? teamName.toLowerCase() : undefined,
    });
  }

  if (pool.length === 0) return [];

  const shuffled = weightedRecencyShuffleByScore(pool, (row) => row.score);
  return shuffled.slice(0, count).map((row) => ({
    id: String(row.photo_id),
    thumb_url: buildThumbnailUrl(row.photo_url),
    photo_url: row.photo_url,
    title: row.title,
    author: row.author,
    team_name: row.team_name,
  }));
}

/**
 * Returns up to `count` random approved photos from the club (any activity).
 * Uses bounded server RPC when available; falls back to a capped client query.
 * Pass excludeIds when loading more to avoid duplicates.
 */
export const getRandomClubPhotos = async (
  count: number,
  excludeIds: string[] = []
): Promise<ClubPhotoCardItem[]> => {
  const excludeNumeric = excludeIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  const { data, error } = await supabase.rpc("get_random_club_photos", {
    p_count: count,
    p_exclude_ids: excludeNumeric,
  });

  if (!error && data != null) {
    const rows = data as {
      photo_id: number;
      photo_url: string;
      activity_title: string;
      nickname: string;
      team_name: string;
    }[];
    if (rows.length > 0) {
      return mapClubPhotoRows(rows);
    }
    if (excludeNumeric.length === 0) return [];
  } else if (error) {
    console.warn("get_random_club_photos RPC failed, using fallback:", error.message);
  }

  return getRandomClubPhotosFallback(count, excludeIds);
};

export type EarliestAvailableMission = {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  xp: number | null;
};

/** Returns the earliest released mission in campfire session scope (oldest release_date first). */
export const getEarliestAvailableMission = async (): Promise<EarliestAvailableMission | null> => {
  const today = ukTodayForChapterUnlockGate();

  const { data: sessionRows, error: sessionsError } = await supabase
    .from("campfire_sessions")
    .select("missions, scheduled_at, id");

  if (sessionsError) {
    throw new Error(`Failed to load campfire sessions: ${sessionsError.message}`);
  }

  const missionIds = new Set<number>();
  for (const row of sessionRows ?? []) {
    const ids = (row.missions as number[] | null) ?? [];
    for (const id of ids) {
      if (Number.isFinite(id)) missionIds.add(Number(id));
    }
  }

  if (missionIds.size === 0) return null;

  const { data, error } = await supabase
    .from("activities")
    .select("id, title, description, image, xp, release_date, session_order")
    .in("id", [...missionIds])
    .eq("content_status", "published")
    .not("release_date", "is", null)
    .lte("release_date", today)
    .order("release_date", { ascending: true })
    .order("session_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load earliest available mission: ${error.message}`);
  }

  if (!data?.id) return null;

  return {
    id: data.id,
    title: data.title,
    description: data.description ?? null,
    image: data.image ?? null,
    xp: data.xp ?? null,
  };
};

/** Returns true if any of the given profiles has completed the activity. */
export const hasAnyProfileCompletedActivity = async (
  profileIds: number[],
  activityId: number
): Promise<boolean> => {
  if (profileIds.length === 0) return false;

  const { data, error } = await supabase
    .from("user_activity_progress")
    .select("id")
    .in("profile_id", profileIds)
    .eq("activity_id", activityId)
    .not("completed_at", "is", null)
    .limit(1);

  if (error) {
    throw new Error(`Failed to check mission completion: ${error.message}`);
  }

  return (data?.length ?? 0) > 0;
};
