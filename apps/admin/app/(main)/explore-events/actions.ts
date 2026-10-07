"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { londonLocalToIso } from "@/lib/london-time";

export type ExploreEventFormState = { error?: string; saved?: boolean };

export async function updateExploreEvent(
  id: string,
  _prev: ExploreEventFormState,
  formData: FormData
): Promise<ExploreEventFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const startsAt = londonLocalToIso(String(formData.get("starts_at") ?? ""));
  const endsAt = londonLocalToIso(String(formData.get("ends_at") ?? ""));
  const chancePercent = Number(formData.get("pack_chance_percent"));
  const isActive = String(formData.get("is_active") ?? "") === "true";

  if (!name) return { error: "Name is required" };
  if (!startsAt || !endsAt) return { error: "Start and end dates are required" };
  if (new Date(endsAt) <= new Date(startsAt)) {
    return { error: "The end must be after the start" };
  }
  if (!Number.isFinite(chancePercent) || chancePercent < 0 || chancePercent > 100) {
    return { error: "Pack chance must be between 0 and 100" };
  }

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("explore_events")
      .update({
        name,
        starts_at: startsAt,
        ends_at: endsAt,
        pack_chance: chancePercent / 100,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/explore-events");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update event" };
  }
  return { saved: true };
}
