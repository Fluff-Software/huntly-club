import { supabase } from "./supabase";
import type { Tables } from "@/models/supabase";

export type ExploreLocation = Tables<"explore_locations">;
export type ExploreCollectible = Tables<"explore_collectibles">;
export type ExploreProfileCollectible = Tables<"explore_profile_collectibles">;

/** Locations are evergreen (always-on world map), so callers fetch once per session rather than polling. */
export const getActiveLocations = async (): Promise<ExploreLocation[]> => {
  const { data, error } = await supabase
    .from("explore_locations")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching explore locations:", error);
    throw new Error(`Failed to fetch explore locations: ${error.message}`);
  }

  return data || [];
};

export const getCollectibleCatalog = async (): Promise<ExploreCollectible[]> => {
  const { data, error } = await supabase
    .from("explore_collectibles")
    .select("*")
    .eq("is_active", true)
    .order("rarity", { ascending: true });

  if (error) {
    console.error("Error fetching explore collectible catalog:", error);
    throw new Error(`Failed to fetch collectible catalog: ${error.message}`);
  }

  return data || [];
};

export const getProfileInventory = async (
  profileId: number
): Promise<ExploreProfileCollectible[]> => {
  const { data, error } = await supabase
    .from("explore_profile_collectibles")
    .select("*")
    .eq("profile_id", profileId);

  if (error) {
    console.error("Error fetching profile collectible inventory:", error);
    throw new Error(`Failed to fetch collectible inventory: ${error.message}`);
  }

  return data || [];
};

/** Distinct locations this profile has already checked in to, for dimming discovered map markers. */
export const getVisitedLocationIds = async (profileId: number): Promise<Set<number>> => {
  const { data, error } = await supabase
    .from("explore_visits")
    .select("location_id")
    .eq("profile_id", profileId);

  if (error) {
    console.error("Error fetching explore visit history:", error);
    throw new Error(`Failed to fetch visit history: ${error.message}`);
  }

  return new Set((data || []).map((row) => row.location_id));
};
