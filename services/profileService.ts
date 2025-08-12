import { supabase } from "./supabase";
import { generateNickname } from "./nicknameGenerator";
import { Tables, TablesInsert, TablesUpdate } from "@/models/supabase";

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
  profile: Omit<ProfileInsert, "id" | "xp" | "nickname">
): Promise<Profile> => {
  const profileData = {
    ...profile,
    xp: 0,
    nickname: generateNickname()
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