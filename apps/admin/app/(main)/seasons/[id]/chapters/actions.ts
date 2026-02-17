"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type ChapterFormState = { error?: string };

type BodySlide =
  | { type: "text"; value: string }
  | { type: "image"; value: string }
  | { type: "text-image"; text: string; image: string };

function getBodySlides(formData: FormData): BodySlide[] {
  const raw = formData.get("body_slides");
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is BodySlide => {
      if (p == null || typeof p !== "object") return false;
      const obj = p as Record<string, unknown>;
      if (obj.type === "text-image") {
        return typeof obj.text === "string" && typeof obj.image === "string";
      }
      return typeof obj.type === "string" && typeof obj.value === "string";
    });
  } catch {
    return [];
  }
}

export async function createChapter(
  seasonId: number,
  _prev: ChapterFormState,
  formData: FormData
): Promise<ChapterFormState> {
  const weekNumber = parseInt(String(formData.get("week_number")), 10);
  const title = (formData.get("title") as string)?.trim();
  const image = (formData.get("image") as string)?.trim() || null;
  const bodySlides = getBodySlides(formData);
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
      body_slides: bodySlides,
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
  const bodySlides = getBodySlides(formData);
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
        body_slides: bodySlides,
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
