"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

function parseCategories(value: string): string[] {
  const trimmed = (value || "").trim();
  if (!trimmed) return [];
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
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
  const hints = (formData.get("hints") as string)?.trim() || null;
  const tips = (formData.get("tips") as string)?.trim() || null;
  const trivia = (formData.get("trivia") as string)?.trim() || null;
  const image = (formData.get("image") as string)?.trim() || null;
  const xp = parseInt(String(formData.get("xp")), 10);
  const photoRequired = formData.get("photo_required") === "on";
  const categories = parseCategories((formData.get("categories") as string) ?? "");

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("activities").insert({
      name,
      title,
      description,
      long_description: longDescription,
      hints,
      tips,
      trivia,
      image: image || null,
      xp: Number.isNaN(xp) ? 10 : xp,
      photo_required: photoRequired,
      categories: categories.length ? categories : [],
    });

    if (error) return { error: error.message };
    revalidatePath("/activities");
    revalidatePath("/dashboard");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to create activity",
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
  const hints = (formData.get("hints") as string)?.trim() || null;
  const tips = (formData.get("tips") as string)?.trim() || null;
  const trivia = (formData.get("trivia") as string)?.trim() || null;
  const image = (formData.get("image") as string)?.trim() || null;
  const xp = parseInt(String(formData.get("xp")), 10);
  const photoRequired = formData.get("photo_required") === "on";
  const categories = parseCategories((formData.get("categories") as string) ?? "");

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("activities")
      .update({
        name,
        title,
        description,
        long_description: longDescription,
        hints,
        tips,
        trivia,
        image: image || null,
        xp: Number.isNaN(xp) ? 10 : xp,
        photo_required: photoRequired,
        categories: categories.length ? categories : [],
      })
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/activities");
    revalidatePath(`/activities/${id}/edit`);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to update activity",
    };
  }
  return {};
}
