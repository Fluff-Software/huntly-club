"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type SeasonFormState = {
  error?: string;
};

export async function createSeason(
  _prev: SeasonFormState,
  formData: FormData
): Promise<SeasonFormState> {
  const name = (formData.get("name") as string)?.trim() || null;
  const heroImageUrl = (formData.get("hero_image") as string)?.trim() || null;

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("seasons").insert({
      name: name || null,
      hero_image: heroImageUrl || null,
    });

    if (error) return { error: error.message };
    revalidatePath("/seasons");
    revalidatePath("/dashboard");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to create season",
    };
  }
  return {};
}

export async function updateSeason(
  id: number,
  _prev: SeasonFormState,
  formData: FormData
): Promise<SeasonFormState> {
  const name = (formData.get("name") as string)?.trim() || null;
  const heroImageUrl = (formData.get("hero_image") as string)?.trim() || null;
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("seasons")
      .update({
        name: name || null,
        hero_image: heroImageUrl || null,
      })
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/seasons");
    revalidatePath(`/seasons/${id}/edit`);
    revalidatePath(`/seasons/${id}/chapters`);
    revalidatePath("/dashboard");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to update season",
    };
  }
  return {};
}
