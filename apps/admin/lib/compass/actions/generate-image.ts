"use server";

import { createCompassClient, COMPASS_MODELS, MODEL_COSTS } from "../client";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  detectCaptainsInPrompt,
  getCaptainReferenceImageUrl,
} from "@/lib/captains";

export type ImageQuality = "fast" | "quality";

type GenerateImageOpts = {
  imageAssetId: number;
  prompt: string;
  quality?: ImageQuality;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  createdBy?: string;
};

export type GenerateImageResult = {
  generationId: number;
  storagePath: string;
  publicUrl: string;
  costUsd: number;
};

function buildEnhancedPrompt(prompt: string): {
  enhancedPrompt: string;
  referenceImageUrl: string | null;
} {
  const captainsInPrompt = detectCaptainsInPrompt(prompt);

  if (captainsInPrompt.length === 0) {
    return { enhancedPrompt: prompt, referenceImageUrl: null };
  }

  // Inject visual anchors for each captain detected
  const anchorLines = captainsInPrompt.map(
    (c) =>
      `${c.name} (${c.team} captain): ${c.imageAnchors}. Always depicted as a real child in an outdoor adventure brand world — not a cartoon or fantasy hero.`
  );

  const enhancedPrompt = [
    `CHARACTER CONSISTENCY REQUIRED. The following characters must match their established appearance exactly:`,
    ...anchorLines,
    ``,
    prompt,
  ].join("\n");

  // Use the first detected captain's reference image for conditioning
  const referenceImageUrl = getCaptainReferenceImageUrl(captainsInPrompt[0].slug);

  return { enhancedPrompt, referenceImageUrl };
}

export async function generateImage(
  opts: GenerateImageOpts
): Promise<{ error?: string; result?: GenerateImageResult }> {
  const { imageAssetId, prompt, quality = "fast", size = "1024x1024", createdBy } = opts;

  const dailyCeilingUsd = parseFloat(
    process.env.COMPASS_DAILY_COST_CEILING_USD ?? "5"
  );

  const supabase = createServerSupabaseClient();

  const today = new Date().toISOString().slice(0, 10);
  const { data: spendRows } = await supabase
    .from("compass_generations")
    .select("cost_usd")
    .gte("created_at", today);

  const todaySpend = (spendRows ?? []).reduce(
    (sum, r) => sum + Number(r.cost_usd ?? 0),
    0
  );

  const model = quality === "quality" ? COMPASS_MODELS.imageQuality : COMPASS_MODELS.imageFast;
  const costRates = MODEL_COSTS[model];
  const estimatedCost = "perImage" in costRates ? costRates.perImage : 0;

  if (todaySpend + estimatedCost >= dailyCeilingUsd) {
    return {
      error: `Daily cost ceiling of $${dailyCeilingUsd} would be exceeded. Today's spend: $${todaySpend.toFixed(4)}.`,
    };
  }

  const { enhancedPrompt, referenceImageUrl } = buildEnhancedPrompt(prompt);

  const client = createCompassClient();

  // Build request body — flux-1.1-pro supports image conditioning via `image` + `strength`
  // flux-schnell does not support conditioning, so we only pass it for quality model
  const imageRequestBody: Record<string, unknown> = {
    model,
    prompt: enhancedPrompt,
    n: 1,
    size,
  };

  if (quality === "quality" && referenceImageUrl) {
    imageRequestBody.image = referenceImageUrl;
    // Low strength: generation is mostly prompt-driven but anchored to the reference
    imageRequestBody.strength = 0.25;
  }

  let imageUrl: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await client.images.generate(imageRequestBody as any);
    const url = response.data?.[0]?.url;
    if (!url) return { error: "No image URL returned from Compass" };
    imageUrl = url;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Image generation failed" };
  }

  // Download the generated image
  let imageBuffer: ArrayBuffer;
  try {
    const fetchResponse = await fetch(imageUrl);
    if (!fetchResponse.ok) return { error: "Failed to download generated image" };
    imageBuffer = await fetchResponse.arrayBuffer();
  } catch {
    return { error: "Failed to download generated image" };
  }

  // Upload to Supabase Storage
  const fileName = `compass-generated/${imageAssetId}-${Date.now()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from("season-images")
    .upload(fileName, imageBuffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError) {
    return { error: `Storage upload failed: ${uploadError.message}` };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("season-images").getPublicUrl(fileName);

  await supabase
    .from("image_assets")
    .update({
      storage_path: publicUrl,
      status: "image_uploaded",
      prompt_status: "approved",
    })
    .eq("id", imageAssetId);

  const { data: genRow } = await supabase
    .from("compass_generations")
    .insert({
      action: "generate_image",
      entity_type: "image_asset",
      entity_id: imageAssetId,
      model,
      input: { prompt, enhancedPrompt, size, quality, referenceImageUsed: !!referenceImageUrl } as object,
      system_prompt_version: "generate-image-v2",
      output: { image_url: publicUrl, original_url: imageUrl } as object,
      tokens_in: 0,
      tokens_out: 0,
      cost_usd: estimatedCost,
      accepted: true,
      accepted_at: new Date().toISOString(),
      created_by: createdBy ?? null,
    })
    .select("id")
    .single();

  return {
    result: {
      generationId: genRow?.id ?? 0,
      storagePath: fileName,
      publicUrl,
      costUsd: estimatedCost,
    },
  };
}
