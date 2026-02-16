"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type ChapterFormState = { error?: string };

function getBodyParts(formData: FormData): string[] {
  const raw = formData.getAll("body_parts");
  return raw
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

export async function createChapter(
  seasonId: number,
  _prev: ChapterFormState,
  formData: FormData
): Promise<ChapterFormState> {
  const weekNumber = parseInt(String(formData.get("week_number")), 10);
  const title = (formData.get("title") as string)?.trim();
  const image = (formData.get("image") as string)?.trim() || null;
  const bodyParts = getBodyParts(formData);
  const unlockDate = formData.get("unlock_date") as string;

  if (!title || !unlockDate) return { error: "Title and unlock date are required" };
  if (weekNumber < 1 || weekNumber > 12) return { error: "Week must be 1–12" };

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("chapters").insert({
      season_id: seasonId,
      week_number: weekNumber,
      title,
      image: image || null,
      body_parts: bodyParts,
      unlock_date: unlockDate,
    });

    if (error) return { error: error.message };
    revalidatePath(`/seasons/${seasonId}/chapters`);
    revalidatePath("/dashboard");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to create chapter",
    };
  }
  return {};
}

export async function updateChapter(
  chapterId: number,
  seasonId: number,
  _prev: ChapterFormState,
  formData: FormData
): Promise<ChapterFormState> {
  const weekNumber = parseInt(String(formData.get("week_number")), 10);
  const title = (formData.get("title") as string)?.trim();
  const image = (formData.get("image") as string)?.trim() || null;
  const bodyParts = getBodyParts(formData);
  const unlockDate = formData.get("unlock_date") as string;

  if (!title || !unlockDate) return { error: "Title and unlock date are required" };
  if (weekNumber < 1 || weekNumber > 12) return { error: "Week must be 1–12" };

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("chapters")
      .update({
        week_number: weekNumber,
        title,
        image: image || null,
        body_parts: bodyParts,
        unlock_date: unlockDate,
      })
      .eq("id", chapterId);

    if (error) return { error: error.message };
    revalidatePath(`/seasons/${seasonId}/chapters`);
    revalidatePath(`/seasons/${seasonId}/chapters/${chapterId}/edit`);
    revalidatePath("/dashboard");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to update chapter",
    };
  }
  return {};
}

export async function setChapterActivities(
  chapterId: number,
  seasonId: number,
  activityIds: number[]
): Promise<{ error?: string }> {
  try {
    const supabase = createServerSupabaseClient();
    await supabase.from("chapter_activities").delete().eq("chapter_id", chapterId);

    if (activityIds.length > 0) {
      const rows = activityIds.map((activity_id, index) => ({
        chapter_id: chapterId,
        activity_id,
        order: index,
      }));
      const { error } = await supabase.from("chapter_activities").insert(rows);
      if (error) return { error: error.message };
    }

    revalidatePath(`/seasons/${seasonId}/chapters/${chapterId}/edit`);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to update missions",
    };
  }
  return {};
}
