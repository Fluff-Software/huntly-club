import { supabase } from "./supabase";
import { Tables } from "@/models/supabase";

// Use Supabase generated types
export type Activity = Tables<"activities">;
export type Pack = Tables<"packs"> & {
  activities: Activity[];
};
export type PackActivity = Tables<"pack_activities">;

// Helper function to safely transform activity data
function transformActivity(activityData: any): Activity {
  return {
    id: activityData.id,
    name: activityData.name,
    title: activityData.title,
    description: activityData.description,
    image: activityData.image,
    xp: activityData.xp,
    created_at: activityData.created_at,
  };
}

// Helper function to check if data looks like an activity
function isValidActivity(data: any): boolean {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'number' &&
    typeof data.name === 'string' &&
    typeof data.title === 'string'
  );
}

export const getPacks = async (): Promise<Pack[]> => {
  // Get all packs with their activities in a single query
  const { data, error } = await supabase
    .from("packs")
    .select(
      `
        id,
        name,
        colour,
        pack_activities(
          order,
          activities(
            id,
            name,
            title,
            description,
            image,
            xp,
            created_at
          )
        )
      `
    )
    .order("id");

  if (error) {
    console.error("Error fetching packs:", error);
    throw new Error(`Failed to fetch packs: ${error.message}`);
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  // Transform the data to flatten the activities with proper type safety
  const transformedPacks: Pack[] = data.map((pack: any) => {
    const packActivities = pack.pack_activities || [];
    
    // Sort by order and extract activities with proper validation
    const activities: Activity[] = packActivities
      .filter((pa: any) => pa && pa.activities && isValidActivity(pa.activities))
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      .map((pa: any) => transformActivity(pa.activities));

    return {
      id: pack.id,
      name: pack.name,
      colour: pack.colour,
      created_at: pack.created_at || new Date().toISOString(),
      activities,
    };
  });

  return transformedPacks;
};

export const getPackById = async (packId: number): Promise<Pack | null> => {
  // First get the pack
  const { data: packData, error: packError } = await supabase
    .from("packs")
    .select("id, name, colour, created_at")
    .eq("id", packId)
    .single();

  if (packError) {
    console.error("Error fetching pack:", packError);
    throw new Error(`Failed to fetch pack: ${packError.message}`);
  }

  if (!packData) return null;

  // Then get activities for this pack
  const { data: packActivitiesData, error: activitiesError } = await supabase
    .from("pack_activities")
    .select(
      `
      order,
      activities(
        id,
        name,
        title,
        description,
        image,
        xp,
        created_at
      )
    `
    )
    .eq("pack_id", packId)
    .order("order");

  if (activitiesError) {
    console.error("Error fetching activities for pack:", packId, activitiesError);
    // Return pack with empty activities array instead of null
    return {
      ...packData,
      activities: [],
    };
  }

  // Type-safe transformation of pack activities
  const activities: Activity[] = (packActivitiesData || [])
    .filter((pa: any) => pa && pa.activities && isValidActivity(pa.activities))
    .map((pa: any) => transformActivity(pa.activities));

  return {
    ...packData,
    activities,
  };
};