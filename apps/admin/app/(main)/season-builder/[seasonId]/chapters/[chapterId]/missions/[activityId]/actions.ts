"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generateMissionCoverPrompt } from "@/lib/compass/actions/generate-mission-cover-prompt";

export async function ensureActivityCoverImageAsset(opts: {
  seasonId: number;
  chapterId: number;
  activityId: number;
}): Promise<{ error?: string; imageAssetId?: number }> {
  const supabase = createServerSupabaseClient();

  const { data: existing, error: existingError } = await supabase
    .from("image_assets")
    .select("id")
    .eq("entity_type", "activity")
    .eq("entity_id", opts.activityId)
    .eq("slot_key", "cover")
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (existing?.id) return { imageAssetId: existing.id as number };

  const [{ data: activity }, { data: chapter }, { data: season }] = await Promise.all([
    supabase
      .from("activities")
      .select(
        "title, name, description, mission_type, estimated_duration, safety_notes, optional_items, steps"
      )
      .eq("id", opts.activityId)
      .single(),
    supabase
      .from("chapters")
      .select("title, summary")
      .eq("id", opts.chapterId)
      .single(),
    supabase
      .from("seasons")
      .select("brief, target_age_min, target_age_max")
      .eq("id", opts.seasonId)
      .single(),
  ]);

  const title = (activity?.title ?? activity?.name ?? "Mission").toString().trim();

  const compass = await generateMissionCoverPrompt({
    seasonBrief: (season?.brief ?? "").toString(),
    chapterTitle: (chapter?.title ?? "").toString(),
    chapterSummary: (chapter?.summary ?? "").toString(),
    targetAgeMin: Number(season?.target_age_min ?? 5),
    targetAgeMax: Number(season?.target_age_max ?? 10),
    mission: {
      title,
      description: (activity as any)?.description ?? undefined,
      mission_type: (activity as any)?.mission_type ?? null,
      estimated_duration: (activity as any)?.estimated_duration ?? undefined,
      safety_notes: (activity as any)?.safety_notes ?? undefined,
      optional_items: (activity as any)?.optional_items ?? undefined,
      steps: Array.isArray((activity as any)?.steps) ? (activity as any).steps : undefined,
    },
  });

  const prompt = compass.output.prompt;

  const { data: inserted, error: insertError } = await supabase
    .from("image_assets")
    .insert({
      entity_type: "activity",
      entity_id: opts.activityId,
      slot_key: "cover",
      prompt,
      prompt_status: "approved",
      status: "prompt_ready",
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };

  revalidatePath(
    `/season-builder/${opts.seasonId}/chapters/${opts.chapterId}/missions/${opts.activityId}`
  );
  revalidatePath(`/season-builder/${opts.seasonId}/images`);
  return { imageAssetId: inserted?.id as number };
}

export async function regenerateActivityCoverPrompt(opts: {
  seasonId: number;
  chapterId: number;
  activityId: number;
  imageAssetId: number;
}): Promise<{ error?: string; prompt?: string }> {
  const supabase = createServerSupabaseClient();

  const [{ data: activity }, { data: chapter }, { data: season }] = await Promise.all([
    supabase
      .from("activities")
      .select(
        "title, name, description, mission_type, estimated_duration, safety_notes, optional_items, steps"
      )
      .eq("id", opts.activityId)
      .single(),
    supabase
      .from("chapters")
      .select("title, summary")
      .eq("id", opts.chapterId)
      .single(),
    supabase
      .from("seasons")
      .select("brief, target_age_min, target_age_max")
      .eq("id", opts.seasonId)
      .single(),
  ]);

  const title = (activity?.title ?? activity?.name ?? "Mission").toString().trim();

  const compass = await generateMissionCoverPrompt({
    seasonBrief: (season?.brief ?? "").toString(),
    chapterTitle: (chapter?.title ?? "").toString(),
    chapterSummary: (chapter?.summary ?? "").toString(),
    targetAgeMin: Number(season?.target_age_min ?? 5),
    targetAgeMax: Number(season?.target_age_max ?? 10),
    mission: {
      title,
      description: (activity as any)?.description ?? undefined,
      mission_type: (activity as any)?.mission_type ?? null,
      estimated_duration: (activity as any)?.estimated_duration ?? undefined,
      safety_notes: (activity as any)?.safety_notes ?? undefined,
      optional_items: (activity as any)?.optional_items ?? undefined,
      steps: Array.isArray((activity as any)?.steps) ? (activity as any).steps : undefined,
    },
  });

  const prompt = compass.output.prompt;

  const { error } = await supabase
    .from("image_assets")
    .update({
      prompt,
      prompt_status: "approved",
      status: "prompt_ready",
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.imageAssetId);

  if (error) return { error: error.message };

  revalidatePath(
    `/season-builder/${opts.seasonId}/chapters/${opts.chapterId}/missions/${opts.activityId}`
  );
  revalidatePath(`/season-builder/${opts.seasonId}/images`);
  return { prompt };
}

export async function attachUploadedImageToAsset(opts: {
  seasonId: number;
  chapterId: number;
  activityId: number;
  imageAssetId: number;
  publicUrl: string;
}): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const url = (opts.publicUrl ?? "").trim();
  if (!url) return { error: "No image URL provided" };

  const { error } = await supabase
    .from("image_assets")
    .update({
      storage_path: url,
      status: "image_uploaded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.imageAssetId);

  if (error) return { error: error.message };

  revalidatePath(
    `/season-builder/${opts.seasonId}/chapters/${opts.chapterId}/missions/${opts.activityId}`
  );
  revalidatePath(`/season-builder/${opts.seasonId}/images`);
  return {};
}

