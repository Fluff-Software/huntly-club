import { supabase } from "./supabase";
import { generateNickname } from "./nicknameGenerator";

export type Profile = {
  id: number;
  user_id: string;
  name: string;
  nickname: string;
  colour: string;
  team: number;
  xp: number;
};

export const getProfiles = async (userId: string): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching profiles:", error);
    throw error;
  }

  return data || [];
};

export const createProfile = async (
  profile: Omit<Profile, "id" | "xp" | "nickname">
): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .insert([{ ...profile, xp: 0, nickname: generateNickname() }])
    .select()
    .single();

  if (error) {
    console.error("Error creating profile:", error);
    throw error;
  }

  return data;
};

export const getTeams = async () => {
  const { data, error } = await supabase.from("teams").select("*");

  if (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }

  return data || [];
};

export const updateProfile = async (
  profileId: number,
  updates: Partial<Omit<Profile, "id" | "user_id" | "xp">>
): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profileId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    throw error;
  }

  return data;
};
