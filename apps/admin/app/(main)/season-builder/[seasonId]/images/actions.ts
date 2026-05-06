"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generateImage, type ImageQuality } from "@/lib/compass/actions/generate-image";

export async function createImageAsset(
  seasonId: number,
  formData: FormData
): Promise<{ error?: string }> {
  const entityType = formData.get("entity_type") as string;
  const entityId = parseInt(formData.get("entity_id") as string);
  const slotKey = (formData.get("slot_key") as string)?.trim() || null;
  const prompt = (formData.get("prompt") as string)?.trim() || null;

  if (!entityType || !entityId) return { error: "Entity type and ID are required" };

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("image_assets").insert({
    entity_type: entityType,
    entity_id: entityId,
    slot_key: slotKey,
    prompt,
    prompt_status: prompt ? "approved" : "draft",
    status: prompt ? "prompt_ready" : "needs_prompt",
  });

  if (error) return { error: error.message };
  revalidatePath(`/season-builder/${seasonId}/images`);
  return {};
}

export async function updateImagePrompt(
  imageAssetId: number,
  seasonId: number,
  formData: FormData
): Promise<{ error?: string }> {
  const prompt = (formData.get("prompt") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("image_assets")
    .update({
      prompt,
      notes,
      prompt_status: prompt ? "approved" : "draft",
      status: prompt ? "prompt_ready" : "needs_prompt",
    })
    .eq("id", imageAssetId);

  if (error) return { error: error.message };
  revalidatePath(`/season-builder/${seasonId}/images`);
  return {};
}

export async function approveImageAsset(
  imageAssetId: number,
  seasonId: number
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("image_assets")
    .update({ status: "approved" })
    .eq("id", imageAssetId);

  if (error) return { error: error.message };
  revalidatePath(`/season-builder/${seasonId}/images`);
  return {};
}

export async function generateImageForAsset(
  imageAssetId: number,
  seasonId: number,
  quality: ImageQuality = "fast"
): Promise<{ error?: string }> {
  // Fetch the prompt from the asset
  const supabase = createServerSupabaseClient();
  const { data: asset, error: fetchError } = await supabase
    .from("image_assets")
    .select("prompt")
    .eq("id", imageAssetId)
    .single();

  if (fetchError || !asset?.prompt) {
    return { error: "Image asset needs an approved prompt before generating" };
  }

  const { error, result } = await generateImage({
    imageAssetId,
    prompt: asset.prompt,
    quality,
    size: "1792x1024",
  });

  if (error) return { error };
  if (!result) return { error: "No result returned" };

  revalidatePath(`/season-builder/${seasonId}/images`);
  return {};
}
