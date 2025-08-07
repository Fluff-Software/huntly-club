import { supabase } from "./supabase";

export type Activity = {
  id: number;
  name: string;
  title: string;
  description: string | null;
  image: string | null;
  xp: number;
};

export type Pack = {
  id: number;
  name: string;
  colour: string | null;
  activities: Activity[];
};

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
            xp
          )
        )
      `
    )
    .order("id");

  if (error) {
    console.error("Error fetching packs:", error);
    throw error;
  }

  // Transform the data to flatten the activities
  const transformedPacks = (data || []).map((pack) => {
    const activities =
      pack.pack_activities
        ?.sort((a: any, b: any) => a.order - b.order)
        ?.map((pa: any) => pa.activities)
        ?.filter(Boolean) || [];

    return {
      id: pack.id,
      name: pack.name,
      colour: pack.colour,
      activities,
    };
  });

  return transformedPacks;
};

export const getPackById = async (packId: number): Promise<Pack | null> => {
  // First get the pack
  const { data: packData, error: packError } = await supabase
    .from("packs")
    .select("id, name, colour")
    .eq("id", packId)
    .single();

  if (packError) {
    console.error("Error fetching pack:", packError);
    throw packError;
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
        xp
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
    return {
      ...packData,
      activities: [],
    };
  }

  const activities = (packActivitiesData || [])
    .map((pa: any) => pa.activities)
    .filter(Boolean);

  return {
    ...packData,
    activities,
  };
};
