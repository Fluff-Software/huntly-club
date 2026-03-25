import { supabase } from "./supabase";
import { Tables } from "@/models/supabase";
import { Activity } from "@/types/activity";

// Use Supabase generated types
export type Pack = Tables<"packs"> & {
  activities: Activity[];
};
export type PackActivity = Tables<"pack_activities">;

// Helper function to safely transform activity data
function toCategoryIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is number => typeof x === "number" && x > 0);
}

export function parsePrepChecklist(raw: unknown): Activity["prep_checklist"] {
  if (!Array.isArray(raw)) return null;
  const out: { title: string; description: string }[] = [];
  for (const item of raw) {
    if (item && typeof item === "object" && "title" in item && "description" in item) {
      out.push({
        title: String((item as { title: unknown }).title),
        description: String((item as { description: unknown }).description),
      });
    }
  }
  return out.length ? out : null;
}

export function parseSteps(raw: unknown): Activity["steps"] {
  if (!Array.isArray(raw)) return null;
  const out: { instruction: string; tip: string | null; media_url: string | null }[] = [];
  for (const item of raw) {
    if (item && typeof item === "object" && "instruction" in item) {
      const o = item as { instruction: unknown; tip?: unknown; media_url?: unknown };
      out.push({
        instruction: String(o.instruction),
        tip: o.tip != null ? String(o.tip) : null,
        media_url: o.media_url != null ? String(o.media_url) : null,
      });
    }
  }
  return out.length ? out : null;
}

function transformActivity(activityData: any): Activity {
  return {
    id: activityData.id,
    name: activityData.name,
    title: activityData.title,
    description: activityData.description,
    image: activityData.image,
    xp: activityData.xp,
    categories: toCategoryIds(activityData.categories),
    created_at: activityData.created_at,
    intro_urgent_message: activityData.intro_urgent_message ?? null,
    intro_character_name: activityData.intro_character_name ?? null,
    intro_character_avatar_url: activityData.intro_character_avatar_url ?? null,
    intro_dialogue: activityData.intro_dialogue ?? null,
    estimated_duration: activityData.estimated_duration ?? null,
    optional_items: activityData.optional_items ?? null,
    prep_checklist: parsePrepChecklist(activityData.prep_checklist),
    steps: parseSteps(activityData.steps),
    debrief_heading: activityData.debrief_heading ?? null,
    debrief_photo_label: activityData.debrief_photo_label ?? null,
    debrief_question_1: activityData.debrief_question_1 ?? null,
    debrief_question_2: activityData.debrief_question_2 ?? null,
  };
}

// Helper function to get the correct image source
export function getActivityImageSource(imageName: string | null) {
  if (!imageName) return null;

  // Return as URI for all images (now stored in Supabase Storage)
  return { uri: imageName };
}

// Helper function to check if data looks like an activity
function isValidActivity(data: any): boolean {
  return (
    data &&
    typeof data === "object" &&
    typeof data.id === "number" &&
    typeof data.name === "string" &&
    typeof data.title === "string"
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
            categories,
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
      .filter(
        (pa: any) => pa && pa.activities && isValidActivity(pa.activities)
      )
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
    console.error(
      "Error fetching activities for pack:",
      packId,
      activitiesError
    );
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

export const getActivityById = async (
  activityId: number
): Promise<Activity | null> => {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", activityId)
    .single();

  if (error) {
    console.error("Error fetching activity:", error);
    throw new Error(`Failed to fetch activity: ${error.message}`);
  }

  if (!data) return null;

  return transformActivity(data);
};
