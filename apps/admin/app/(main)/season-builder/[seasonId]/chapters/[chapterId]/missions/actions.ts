"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function saveMissionFields(
  activityId: number,
  seasonId: number,
  chapterId: number,
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const missionType = formData.get("mission_type") as string | null;
  const safetyNotes = (formData.get("safety_notes") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const estimatedDuration = (formData.get("estimated_duration") as string)?.trim() || null;

  const { error } = await supabase
    .from("activities")
    .update({
      mission_type: missionType || null,
      safety_notes: safetyNotes,
      description,
      estimated_duration: estimatedDuration,
      updated_at: new Date().toISOString(),
    })
    .eq("id", activityId);

  if (error) return { error: error.message };

  revalidatePath(`/season-builder/${seasonId}/chapters/${chapterId}`);
  revalidatePath(
    `/season-builder/${seasonId}/chapters/${chapterId}/missions/${activityId}`
  );
  return {};
}
