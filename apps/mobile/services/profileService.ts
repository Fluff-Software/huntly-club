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
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId);

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