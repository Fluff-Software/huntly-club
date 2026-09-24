import { supabase } from "./supabase";
import { generateNickname } from "./nicknameGenerator";
import { Tables, TablesInsert, TablesUpdate } from "@/models/supabase";

const USER_PHOTOS_BUCKET = "user-activity-photos";

/** Extract storage file path from a Supabase public URL (object/public/bucket/path). */
function getStoragePathFromPublicUrl(url: string, bucket: string): string | null {
  if (!url || typeof url !== "string") return null;
  const prefix = `/object/public/${bucket}/`;
  const i = url.indexOf(prefix);
  if (i === -1) return null;
  return url.slice(i + prefix.length).trim() || null;
}

// Use Supabase generated types
export type Profile = Tables<"profiles"> & {
  nickname: string; // Add nickname field which isn't in DB yet but used in app
};

export type Team = Tables<"teams">;
export type ProfileInsert = TablesInsert<"profiles"> & {
  nickname?: string;
};
export type ProfileUpdate = TablesUpdate<"profiles"> & {
  nickname?: string;
};

export const getProfiles = async (userId: string): Promise<Profile[]> => {
  // Ordered explicitly: Postgres row order shifts as rows are updated, and
  // several screens treat the first profile as the default player.
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching profiles:", error);
    throw new Error(`Failed to fetch profiles: ${error.message}`);
  }

  // Transform data to include nickname (generate if missing)
  return (data || []).map(profile => ({
    ...profile,
    nickname: profile.nickname || generateNickname()
  }));
};

export const createProfile = async (
  profile: Omit<ProfileInsert, "id" | "xp">
): Promise<Profile> => {
  const profileData = {
    ...profile,
    xp: 0,
    nickname: profile.nickname ?? generateNickname()
  };

  const { data, error } = await supabase
    .from("profiles")
    .insert([profileData])
    .select()
    .single();

  if (error) {
    console.error("Error creating profile:", error);
    throw new Error(`Failed to create profile: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned from profile creation");
  }

  return {
    ...data,
    nickname: profileData.nickname
  };
};

export const getTeams = async (): Promise<Team[]> => {
  const { data, error } = await supabase
    .from("teams")
    .select("*");

  if (error) {
    console.error("Error fetching teams:", error);
    throw new Error(`Failed to fetch teams: ${error.message}`);
  }

  return data || [];
};

export type UserDataRow = {
  user_id: string;
  team: number | null;
  weekly_email: boolean;
  last_seen_season_id: number | null;
  start_mission_step: number;
  first_mission_activity_id: number | null;
  /** True for accounts grandfathered in before the subscription requirement launched. */
  subscription_exempt: boolean;
  /** Separate from weekly_email: gates general/admin broadcast emails, not mission announcements. */
  general_email: boolean;
};

const USER_DATA_SELECT_FULL =
  "user_id, team, weekly_email, last_seen_season_id, start_mission_step, first_mission_activity_id, subscription_exempt, general_email";
const USER_DATA_SELECT_BASE =
  "user_id, team, weekly_email, last_seen_season_id, start_mission_step";

// first_mission_activity_id, subscription_exempt, and general_email are newer columns that may
// not exist yet in every environment; fall back to the base columns rather than breaking
// user_data reads entirely.
function isMissingOptionalColumnError(error: { message?: string }): boolean {
  const message = error.message ?? "";
  return (
    message.includes("first_mission_activity_id") ||
    message.includes("subscription_exempt") ||
    message.includes("general_email")
  );
}

/** Get user_data for the given user (team may be null). */
export const getUserData = async (userId: string): Promise<UserDataRow | null> => {
  const { data, error } = await supabase
    .from("user_data")
    .select(USER_DATA_SELECT_FULL)
    .eq("user_id", userId)
    .single();

  if (!error) {
    return data;
  }

  if (error.code === "PGRST116") return null; // no row

  if (isMissingOptionalColumnError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("user_data")
      .select(USER_DATA_SELECT_BASE)
      .eq("user_id", userId)
      .single();

    if (!fallbackError) {
      // subscription_exempt defaults to false (not grandfathered) when we can't confirm it,
      // so a schema hiccup never accidentally grants free access. general_email defaults to
      // true (matches the column's own DB default) so a schema hiccup never silently unsubscribes.
      return {
        ...fallbackData,
        first_mission_activity_id: null,
        subscription_exempt: false,
        general_email: true,
      };
    }
    if (fallbackError.code === "PGRST116") return null;
    console.error("Error fetching user_data (fallback):", fallbackError);
    throw new Error(`Failed to fetch user data: ${fallbackError.message}`);
  }

  console.error("Error fetching user_data:", error);
  throw new Error(`Failed to fetch user data: ${error.message}`);
};

/** Update the authenticated user's team in user_data (e.g. when they choose a team at sign-up). */
export const updateUserDataTeam = async (userId: string, teamId: number): Promise<void> => {
  const { error } = await supabase
    .from("user_data")
    .update({ team: teamId })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating user_data team:", error);
    throw new Error(`Failed to update user data: ${error.message}`);
  }
};

/** Update the authenticated user's weekly_email preference in user_data. */
export const updateUserDataWeeklyEmail = async (userId: string, weeklyEmail: boolean): Promise<void> => {
  const { error } = await supabase
    .from("user_data")
    .update({ weekly_email: weeklyEmail })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating user_data weekly_email:", error);
    throw new Error(`Failed to update weekly email preference: ${error.message}`);
  }
};

/** Update the authenticated user's general_email preference in user_data. */
export const updateUserDataGeneralEmail = async (userId: string, generalEmail: boolean): Promise<void> => {
  const { error } = await supabase
    .from("user_data")
    .update({ general_email: generalEmail })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating user_data general_email:", error);
    throw new Error(`Failed to update general email preference: ${error.message}`);
  }
};

/** Update the authenticated user's last seen season announcement in user_data. */
export const updateUserDataLastSeenSeasonId = async (
  userId: string,
  seasonId: number
): Promise<void> => {
  const { error } = await supabase
    .from("user_data")
    .update({ last_seen_season_id: seasonId })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating user_data last_seen_season_id:", error);
    throw new Error(`Failed to update last seen season id: ${error.message}`);
  }
};

/** Update the authenticated user's mission-first onboarding step in user_data. */
export const updateUserDataStartMissionStep = async (
  userId: string,
  step: number
): Promise<void> => {
  const { error } = await supabase
    .from("user_data")
    .update({ start_mission_step: step })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating user_data start_mission_step:", error);
    throw new Error(`Failed to update onboarding step: ${error.message}`);
  }
};

/** Persist the user's first-mission target activity id in user_data. */
export const updateUserDataFirstMissionActivityId = async (
  userId: string,
  activityId: number | null
): Promise<void> => {
  const { error } = await supabase
    .from("user_data")
    .update({ first_mission_activity_id: activityId })
    .eq("user_id", userId);

  if (error) {
    if (isMissingOptionalColumnError(error)) {
      console.warn(
        "first_mission_activity_id column missing; run migration 20260621120000 on this Supabase project"
      );
      return;
    }
    console.error("Error updating user_data first_mission_activity_id:", error);
    throw new Error(`Failed to update first mission target: ${error.message}`);
  }
};

export const getTeamById = async (teamId: number): Promise<Team | null> => {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (error) {
    console.error("Error fetching team:", error);
    throw new Error(`Failed to fetch team: ${error.message}`);
  }

  return data;
};

export const updateProfile = async (
  profileId: number,
  updates: Partial<ProfileUpdate>
): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profileId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned from profile update");
  }

  return {
    ...data,
    nickname: updates.nickname || data.nickname || generateNickname()
  };
};

/**
 * Deletes a profile and all related data:
 * - user_activity_progress, user_activity_photos, user_achievements, user_badges
 * - profile row in profiles (profile_public is a view, so no direct delete)
 * - All photos in user-activity-photos storage linked via user_activity_photos
 */
export const deleteProfile = async (profileId: number): Promise<void> => {
  const { data: photoRows, error: photosError } = await supabase
    .from("user_activity_photos")
    .select("photo_url")
    .eq("profile_id", profileId);

  if (photosError) {
    console.error("Error fetching profile photos for deletion:", photosError);
    throw new Error(`Failed to delete profile: ${photosError.message}`);
  }

  const paths: string[] = [];
  for (const row of photoRows ?? []) {
    const path = row.photo_url
      ? getStoragePathFromPublicUrl(row.photo_url, USER_PHOTOS_BUCKET)
      : null;
    if (path) paths.push(path);
  }
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(USER_PHOTOS_BUCKET)
      .remove(paths);
    if (storageError) {
      console.warn("Some profile photos could not be removed from storage:", storageError);
    }
  }

  await supabase.from("user_activity_photos").delete().eq("profile_id", profileId);
  await supabase.from("user_activity_progress").delete().eq("profile_id", profileId);
  await supabase.from("user_achievements").delete().eq("profile_id", profileId);
  await supabase.from("user_badges").delete().eq("profile_id", profileId);
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", profileId);

  if (profileError) {
    console.error("Error deleting profile:", profileError);
    throw new Error(`Failed to delete profile: ${profileError.message}`);
  }
};