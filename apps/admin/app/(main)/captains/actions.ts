"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CaptainFormState = { error?: string };

export async function createCaptain(
  _prev: CaptainFormState,
  formData: FormData
): Promise<CaptainFormState> {
  const name = (formData.get("name") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim();
  const voiceGuide = (formData.get("voice_guide") as string)?.trim();
  const avatarUrl = (formData.get("avatar_url") as string)?.trim() || "";
  const poseOptions = (formData.getAll("pose_options") as string[])
    .map((s) => s.trim())
    .filter(Boolean);

  if (!name || !slug || !voiceGuide) {
    return { error: "Name, slug and voice guide are required" };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("captains").insert({
    name,
    slug,
    voice_guide: voiceGuide,
    avatar_url: avatarUrl,
    pose_options: poseOptions,
  });

  if (error) return { error: error.message };
  revalidatePath("/captains");
  redirect("/captains");
}

export async function updateCaptain(
  id: number,
  _prev: CaptainFormState,
  formData: FormData
): Promise<CaptainFormState> {
  const name = (formData.get("name") as string)?.trim();
  const voiceGuide = (formData.get("voice_guide") as string)?.trim();
  const avatarUrl = (formData.get("avatar_url") as string)?.trim() || "";
  const poseOptions = (formData.getAll("pose_options") as string[])
    .map((s) => s.trim())
    .filter(Boolean);

  if (!name || !voiceGuide) {
    return { error: "Name and voice guide are required" };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("captains")
    .update({
      name,
      voice_guide: voiceGuide,
      avatar_url: avatarUrl,
      pose_options: poseOptions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/captains");
  revalidatePath(`/captains/${id}`);
  return {};
}

export async function deleteCaptain(id: number): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase.from("captains").delete().eq("id", id);
  revalidatePath("/captains");
  redirect("/captains");
}
