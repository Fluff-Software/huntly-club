import { supabase } from "./supabase";
import type { Tables } from "@/models/supabase";

export type ExploreLocation = Tables<"explore_locations">;
export type ExploreCollectible = Tables<"explore_collectibles">;
export type ExploreProfileCollectible = Tables<"explore_profile_collectibles">;

/**
 * Fetch active locations within `radiusMeters` of a point, nearest first.
 *
 * This is the scalable read path: it delegates to the `get_explore_locations_near` RPC, which uses
 * a PostGIS GiST spatial index (ST_DWithin) so the query stays O(nearby) no matter how many
 * locations exist worldwide. The map re-fetches as the player moves rather than loading the planet.
 */
export const getLocationsNear = async (
  latitude: number,
  longitude: number,
  radiusMeters = 5000
): Promise<ExploreLocation[]> => {
  const { data, error } = await supabase.rpc("get_explore_locations_near", {
    p_latitude: latitude,
    p_longitude: longitude,
    p_radius_meters: radiusMeters,
  });

  if (error) {
    console.error("Error fetching nearby explore locations:", error);
    throw new Error(`Failed to fetch nearby explore locations: ${error.message}`);
  }

  return (data as ExploreLocation[]) || [];
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
