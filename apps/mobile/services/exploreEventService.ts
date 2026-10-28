import { supabase } from "@/services/supabase";

export type ExploreEventWindow = {
  slug: string;
  startsAt: Date;
  endsAt: Date;
};

/** Active events from the same table `explore_active_event()` reads (half-open window). */
export async function getActiveExploreEvents(): Promise<ExploreEventWindow[]> {
  const { data, error } = await supabase
    .from("explore_events")
    .select("slug, starts_at, ends_at")
    .eq("is_active", true);
  if (error || !data) return [];
  return data.map((e) => ({
    slug: String(e.slug),
    startsAt: new Date(e.starts_at as string),
    endsAt: new Date(e.ends_at as string),
  }));
}
