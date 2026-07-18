import { supabase } from "./supabase";
import type { ExploreCollectibleRarity } from "@/constants/exploreColors";

export type ExploreCheckInFailureReason =
  | "not_authorized"
  | "location_inactive"
  | "accuracy_too_poor"
  | "too_far"
  | "rate_limited"
  | "no_collectibles_configured";

export type ExploreCheckInResult =
  | {
      success: true;
      distanceMeters: number;
      collectibleId: number;
      collectibleName: string;
      collectibleImageUrl: string;
      collectibleRarity: ExploreCollectibleRarity;
      collectibleFlavorText: string | null;
      isNewCollectible: boolean;
      newCount: number;
      xpAwarded: number;
      newProfileXp: number;
    }
  | {
      success: false;
      failureReason: ExploreCheckInFailureReason;
      distanceMeters: number | null;
    };

type CheckInRpcRow = {
  success: boolean;
  failure_reason: ExploreCheckInFailureReason | null;
  distance_meters: number | null;
  collectible_id: number | null;
  collectible_name: string | null;
  collectible_image_url: string | null;
  collectible_rarity: ExploreCollectibleRarity | null;
  collectible_flavor_text: string | null;
  is_new_collectible: boolean | null;
  new_count: number | null;
  xp_awarded: number | null;
  new_profile_xp: number | null;
};

/**
 * Submits a check-in claim for server-side verification. Client-submitted GPS is never trusted
 * for the actual award -- the RPC recomputes distance and does the weighted collectible draw.
 * A `success: false` result (too far, rate limited, ...) is an expected outcome, not a transport error.
 */
export const checkInToLocation = async (params: {
  profileId: number;
  locationId: number;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}): Promise<ExploreCheckInResult> => {
  const { data, error } = await supabase.rpc("check_in_to_explore_location", {
    p_profile_id: params.profileId,
    p_location_id: params.locationId,
    p_latitude: params.latitude,
    p_longitude: params.longitude,
    p_accuracy_meters: params.accuracyMeters,
  });

  if (error) {
    console.error("Error checking in to explore location:", error);
    throw new Error(`Failed to check in: ${error.message}`);
  }

  const row = (Array.isArray(data) ? data[0] : data) as CheckInRpcRow | undefined;
  if (!row) {
    throw new Error("Check-in returned no result");
  }

  if (!row.success) {
    return {
      success: false,
      failureReason: row.failure_reason ?? "location_inactive",
      distanceMeters: row.distance_meters,
    };
  }

  return {
    success: true,
    distanceMeters: row.distance_meters ?? 0,
    collectibleId: row.collectible_id!,
    collectibleName: row.collectible_name!,
    collectibleImageUrl: row.collectible_image_url!,
    collectibleRarity: row.collectible_rarity!,
    collectibleFlavorText: row.collectible_flavor_text,
    isNewCollectible: row.is_new_collectible!,
    newCount: row.new_count!,
    xpAwarded: row.xp_awarded!,
    newProfileXp: row.new_profile_xp!,
  };
};
