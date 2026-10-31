import { supabase } from "@/services/supabase";
import { ukTodayForChapterUnlockGate } from "@/utils/ukChapterTime";

export type MissionPreview = {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  xp: number | null;
  estimatedDuration: string | null;
  missionType: string | null;
  introUrgentMessage: string | null;
};

/**
 * The mission a brand-new family will see first on the Clubhouse: the oldest of
 * the six latest releases (matches the home screen's pickNextMission for a
 * family with no completions).
 */
export async function fetchFirstMissionPreview(): Promise<MissionPreview | null> {
  const { data, error } = await supabase
    .from("activities")
    .select("id, title, description, image, xp, estimated_duration, mission_type, intro_urgent_message, release_date")
    .eq("content_status", "published")
    .not("release_date", "is", null)
    .lte("release_date", ukTodayForChapterUnlockGate())
    .order("release_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(6);
  if (error || !data?.length) return null;
  const row = data[data.length - 1] as Record<string, unknown>;
  return {
    id: row.id as number,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    image: (row.image as string | null) ?? null,
    xp: (row.xp as number | null) ?? null,
    estimatedDuration: (row.estimated_duration as string | null) ?? null,
    missionType: (row.mission_type as string | null) ?? null,
    introUrgentMessage: (row.intro_urgent_message as string | null) ?? null,
  };
}

/** "45 mins" → "45 min"; "45-60 mins" → "45–60 min". */
export function shortDuration(d: string | null | undefined): string | null {
  if (!d) return null;
  return d.replace(/\s*mins?\b/i, " min").replace("-", "–").trim();
}
