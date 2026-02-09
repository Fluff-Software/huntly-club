import { supabase } from "./supabase";

export type ReactionType =
  | "high_five"
  | "like"
  | "celebrate"
  | "awesome"
  | "great_job";

export interface ActivityReaction {
  id: number;
  activity_progress_id: number;
  profile_id: number;
  reaction_type: ReactionType;
  created_at: string;
  profile: {
    id: number;
    name: string;
    nickname: string | null;
    colour: string;
  };
}

export interface ReactionCount {
  reaction_type: ReactionType;
  count: number;
  has_reacted: boolean;
}

export const getReactionsForActivity = async (
  activityProgressId: number,
  currentProfileId: number
): Promise<ReactionCount[]> => {
  const { data, error } = await supabase
    .from("activity_reactions")
    .select(
      `
      reaction_type,
      profile_id
    `
    )
    .eq("activity_progress_id", activityProgressId);

  if (error) {
    console.error("Error fetching reactions:", error);
    throw new Error(`Failed to fetch reactions: ${error.message}`);
  }

  // Group reactions by type and count them
  const reactionCounts = new Map<
    ReactionType,
    { count: number; has_reacted: boolean }
  >();

  // Initialize all reaction types with 0 count
  const reactionTypes: ReactionType[] = [
    "high_five",
    "like",
    "celebrate",
    "awesome",
    "great_job",
  ];
  reactionTypes.forEach((type) => {
    reactionCounts.set(type, { count: 0, has_reacted: false });
  });

  // Count reactions and check if current user has reacted
  data?.forEach((reaction) => {
    const current = reactionCounts.get(reaction.reaction_type);
    if (current) {
      current.count += 1;
      if (reaction.profile_id === currentProfileId) {
        current.has_reacted = true;
      }
    }
  });

  return reactionTypes.map((type) => {
    const data = reactionCounts.get(type)!;
    return {
      reaction_type: type,
      count: data.count,
      has_reacted: data.has_reacted,
    };
  });
};

export const addReaction = async (
  activityProgressId: number,
  profileId: number,
  reactionType: ReactionType
): Promise<void> => {
  const { error } = await supabase.from("activity_reactions").insert({
    activity_progress_id: activityProgressId,
    profile_id: profileId,
    reaction_type: reactionType,
  });

  if (error) {
    console.error("Error adding reaction:", error);
    throw new Error(`Failed to add reaction: ${error.message}`);
  }
};

export const removeReaction = async (
  activityProgressId: number,
  profileId: number,
  reactionType: ReactionType
): Promise<void> => {
  const { error } = await supabase
    .from("activity_reactions")
    .delete()
    .eq("activity_progress_id", activityProgressId)
    .eq("profile_id", profileId)
    .eq("reaction_type", reactionType);

  if (error) {
    console.error("Error removing reaction:", error);
    throw new Error(`Failed to remove reaction: ${error.message}`);
  }
};

export const toggleReaction = async (
  activityProgressId: number,
  profileId: number,
  reactionType: ReactionType
): Promise<void> => {
  // First check if the reaction already exists
  const { data: existingReaction, error: checkError } = await supabase
    .from("activity_reactions")
    .select("id")
    .eq("activity_progress_id", activityProgressId)
    .eq("profile_id", profileId)
    .eq("reaction_type", reactionType)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking existing reaction:", checkError);
    throw new Error(`Failed to check existing reaction: ${checkError.message}`);
  }

  if (existingReaction) {
    // Reaction exists, remove it
    await removeReaction(activityProgressId, profileId, reactionType);
  } else {
    // Reaction doesn't exist, add it
    await addReaction(activityProgressId, profileId, reactionType);
  }
};
