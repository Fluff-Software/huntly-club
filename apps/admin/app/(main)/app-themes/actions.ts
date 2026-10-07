"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { londonLocalToIso } from "@/lib/london-time";

export type AppThemeFormState = { error?: string; saved?: boolean };

export async function updateAppTheme(
  id: string,
  _prev: AppThemeFormState,
  formData: FormData
): Promise<AppThemeFormState> {
  const startsAt = londonLocalToIso(String(formData.get("starts_at") ?? ""));
  const endsAt = londonLocalToIso(String(formData.get("ends_at") ?? ""));
  const isActive = String(formData.get("is_active") ?? "") === "true";

  if (!startsAt || !endsAt) return { error: "Start and end dates are required" };
  if (new Date(endsAt) <= new Date(startsAt)) {
    return { error: "The end must be after the start" };
  }

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("app_themes")
      .update({
        starts_at: startsAt,
        ends_at: endsAt,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/app-themes");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update theme" };
  }
  return { saved: true };
}
