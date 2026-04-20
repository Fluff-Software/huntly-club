import { supabase } from "@/services/supabase";

export async function getWeekOneRippedMapChapterId(): Promise<number | null> {
  const { data, error } = await supabase
    .from("chapters")
    .select("id")
    .eq("week_number", 1)
    .ilike("title", "%Ripped and Rumpled Map%")
    .order("unlock_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Week 1 chapter: ${error.message}`);
  }

  return data?.id ?? null;
}
