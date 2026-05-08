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
  const { data: asset, error: fetchError } = await supabase
    .from("image_assets")
    .select("id, entity_type, entity_id, slot_key, storage_path")
    .eq("id", imageAssetId)
    .single();

  if (fetchError || !asset) return { error: "Image asset not found" };
  if (!asset.storage_path) return { error: "No generated image found to approve" };

  const { error } = await supabase
    .from("image_assets")
    .update({ status: "approved" })
    .eq("id", imageAssetId);

  if (error) return { error: error.message };

  // If this asset is the mission cover image, apply it to the mission.
  if (asset.entity_type === "activity" && asset.slot_key === "cover") {
    await supabase
      .from("activities")
      .update({ image: asset.storage_path, updated_at: new Date().toISOString() })
      .eq("id", asset.entity_id);

    revalidatePath(`/season-builder/${seasonId}`);
    revalidatePath(`/season-builder/${seasonId}/images`);
  }

  // If this asset corresponds to a story slide, apply it back onto the chapter slides.
  if (asset.entity_type === "story_slide" && asset.slot_key) {
    const m = /^slide-(\d+)$/.exec(asset.slot_key);
    const slideIndex = m ? parseInt(m[1]!, 10) - 1 : -1;

    if (Number.isFinite(slideIndex) && slideIndex >= 0) {
      const { data: chapter } = await supabase
        .from("chapters")
        .select("id, body_slides")
        .eq("id", asset.entity_id)
        .single();

      const slides = (chapter?.body_slides as unknown[]) ?? [];
      if (Array.isArray(slides) && slideIndex < slides.length) {
        const nextSlides = [...slides];
        const raw = nextSlides[slideIndex];

        if (raw && typeof raw === "object") {
          const slide = raw as Record<string, unknown>;
          const type = typeof slide.type === "string" ? slide.type : "";

          if (type === "image") {
            // Support both SlidePartsField schema and StorySlide schema.
            nextSlides[slideIndex] = { ...slide, value: asset.storage_path };
          } else if (type === "text-image") {
            // SlidePartsField: { text, image } / StorySlide: { value, image? }
            if (typeof slide.text === "string") {
              nextSlides[slideIndex] = { ...slide, image: asset.storage_path };
            } else {
              nextSlides[slideIndex] = { ...slide, image: asset.storage_path };
            }
          }

          await supabase
            .from("chapters")
            .update({ body_slides: nextSlides, updated_at: new Date().toISOString() })
            .eq("id", asset.entity_id);

          revalidatePath(`/season-builder/${seasonId}/chapters/${asset.entity_id}`);
        }
      }
    }
  }

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
    .select("prompt, entity_type, slot_key")
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
    disableReferenceImages: asset.entity_type === "activity" && asset.slot_key === "cover",
  });

  if (error) return { error };
  if (!result) return { error: "No result returned" };

  revalidatePath(`/season-builder/${seasonId}/images`);
  return {};
}
