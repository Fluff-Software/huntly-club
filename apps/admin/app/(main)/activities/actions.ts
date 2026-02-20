"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

function parseCategoryIds(formData: FormData): number[] {
  const raw = formData.getAll("categories");
  const ids: number[] = [];
  for (const v of raw) {
    if (v == null || v === "") continue;
    const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
    if (!Number.isNaN(n) && n > 0) ids.push(n);
  }
  return ids;
}

export type ActivityFormState = { error?: string };

export async function createActivity(
  _prev: ActivityFormState,
  formData: FormData
): Promise<ActivityFormState> {
  const name = (formData.get("name") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  if (!name || !title) return { error: "Name and title are required" };

  const description = (formData.get("description") as string)?.trim() || null;
  const longDescription = (formData.get("long_description") as string)?.trim() || null;
  const hints = (formData.getAll("hints") as string[])
    .map((s) => s?.trim())
    .filter(Boolean);
  const tips = (formData.getAll("tips") as string[])
    .map((s) => s?.trim())
    .filter(Boolean);
  const trivia = (formData.get("trivia") as string)?.trim() || null;
  const image = (formData.get("image") as string)?.trim() || null;
  const xp = parseInt(String(formData.get("xp")), 10);
  const photoRequired = formData.get("photo_required") === "on";
  const categoryIds = parseCategoryIds(formData);

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("activities").insert({
      name,
      title,
      description,
      long_description: longDescription,
      hints: hints.length ? hints : null,
      tips: tips.length ? tips : null,
      trivia,
      image: image || null,
      xp: Number.isNaN(xp) ? 10 : xp,
      photo_required: photoRequired,
      categories: categoryIds.length ? categoryIds : [],
    });

    if (error) return { error: error.message };
    revalidatePath("/activities");
    revalidatePath("/dashboard");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to create mission",
    };
  }
  return {};
}

export async function updateActivity(
  id: number,
  _prev: ActivityFormState,
  formData: FormData
): Promise<ActivityFormState> {
  const name = (formData.get("name") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  if (!name || !title) return { error: "Name and title are required" };

  const description = (formData.get("description") as string)?.trim() || null;
  const longDescription = (formData.get("long_description") as string)?.trim() || null;
  const hints = (formData.getAll("hints") as string[])
    .map((s) => s?.trim())
    .filter(Boolean);
  const tips = (formData.getAll("tips") as string[])
    .map((s) => s?.trim())
    .filter(Boolean);
  const trivia = (formData.get("trivia") as string)?.trim() || null;
  const image = (formData.get("image") as string)?.trim() || null;
  const xp = parseInt(String(formData.get("xp")), 10);
  const photoRequired = formData.get("photo_required") === "on";
  const categoryIds = parseCategoryIds(formData);

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("activities")
      .update({
        name,
        title,
        description,
        long_description: longDescription,
        hints: hints.length ? hints : null,
        tips: tips.length ? tips : null,
        trivia,
        image: image || null,
        xp: Number.isNaN(xp) ? 10 : xp,
        photo_required: photoRequired,
        categories: categoryIds.length ? categoryIds : [],
      })
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/activities");
    revalidatePath(`/activities/${id}/edit`);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to update mission",
    };
  }
  return {};
}
