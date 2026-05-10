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
  disableReferenceImages?: boolean;
};

export type GenerateImageResult = {
  generationId: number;
  storagePath: string;
  publicUrl: string;
  costUsd: number;
};

function buildEnhancedPrompt(
  prompt: string,
  opts?: { disableReferenceImages?: boolean }
): {
  enhancedPrompt: string;
  referenceImageUrls: string[];
} {
  if (opts?.disableReferenceImages) {
    const enhancedPrompt = [
      `STYLE CONSISTENCY REQUIRED. Photoreal / high-quality illustration in the Huntly adventure brand world.`,
      `No text, no logos, no watermarks.`,
      ``,
      prompt,
    ].join("\n");
    return { enhancedPrompt, referenceImageUrls: [] };
  }

  const captainsInPrompt = detectCaptainsInPrompt(prompt);

  if (captainsInPrompt.length === 0) {
    const fallback = getCaptainReferenceImageUrl("bella");
    const enhancedPrompt = [
      `STYLE CONSISTENCY REQUIRED. Match the stylization, rendering style, and overall look of the provided reference images.`,
      ``,
      prompt,
    ].join("\n");
    return {
      enhancedPrompt,
      referenceImageUrls: fallback ? [fallback] : [],
    };
  }

  // Inject visual anchors for each captain detected
  const anchorLines = captainsInPrompt.map(
    (c) =>
      `${c.name} (${c.team} captain, age 14): ${c.imageAnchors}. Always depicted as a real 14-year-old in an outdoor adventure brand world — not a cartoon, toddler, or fantasy hero.`
  );

  const enhancedPrompt = [
    `CHARACTER CONSISTENCY REQUIRED. The following characters must match their established appearance exactly:`,
    ...anchorLines,
    ``,
    `STYLE CONSISTENCY REQUIRED. Match the stylization, rendering style, and overall look of the provided reference images.`,
    ``,
    prompt,
  ].join("\n");

  // Use all detected captains' reference images for conditioning
  const referenceImageUrls = captainsInPrompt
    .map((c) => getCaptainReferenceImageUrl(c.slug))
    .filter((u): u is string => typeof u === "string" && u.length > 0);

  return { enhancedPrompt, referenceImageUrls };
}

export async function generateImage(
  opts: GenerateImageOpts
): Promise<{ error?: string; result?: GenerateImageResult }> {
  const {
    imageAssetId,
    prompt,
    quality = "fast",
    size = "1024x1024",
    createdBy,
    disableReferenceImages = false,
  } = opts;

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

  const { enhancedPrompt, referenceImageUrls } = buildEnhancedPrompt(prompt, {
    disableReferenceImages,
  });

  const client = createCompassClient();

  // OpenRouter image generation uses chat completions with `modalities: ["image"]`.
  // It returns a base64 data URL in `message.images[].image_url.url`.
  const aspectRatio =
    size === "1792x1024" ? "16:9" : size === "1024x1792" ? "9:16" : "1:1";

  const messages: Array<Record<string, unknown>> = [
    { role: "user", content: enhancedPrompt },
  ];

  // Optional reference image conditioning (only for quality + if the model supports it).
  // We provide it as an input image to the message; models that don't support it will ignore it.
  if (referenceImageUrls.length > 0) {
    messages.unshift({
      role: "user",
      content: [
        ...referenceImageUrls.map((url) => ({
          type: "image_url",
          image_url: { url },
        })),
        {
          type: "text",
          text: "Reference images for character consistency (one per captain).",
        },
      ],
    });
  }

  let dataUrl: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await client.chat.completions.create({
      model,
      // OpenRouter extension
      modalities: ["image"],
      stream: false,
      // OpenAI-compatible shape; we keep this loose because OpenRouter adds fields.
      messages: messages as any,
      image_config: {
        aspect_ratio: aspectRatio,
        image_size: quality === "quality" ? "2K" : "1K",
      },
    } as any);

    const first = (response as any)?.choices?.[0]?.message?.images?.[0]?.image_url
      ?.url;
    if (!first || typeof first !== "string") {
      return { error: "No image returned from Compass" };
    }
    dataUrl = first;
  } catch (e) {
    const anyErr = e as {
      status?: number;
      message?: string;
      error?: { message?: string };
      response?: { status?: number; data?: unknown };
    };

    const status = anyErr.status ?? anyErr.response?.status;
    const message =
      (typeof anyErr.error?.message === "string" && anyErr.error.message) ||
      (typeof anyErr.message === "string" && anyErr.message) ||
      "Image generation failed";

    // Helpful for debugging provider failures without leaking huge payloads.
    if (status) {
      console.error("generateImage provider error", {
        status,
        model,
        imageAssetId,
        message,
        responseData: anyErr.response?.data,
      });
    } else {
      console.error("generateImage unknown error", { model, imageAssetId, message, e });
    }

    if (status === 429) {
      return {
        error:
          "Provider rate-limited the image request (429). Try again in ~30–120s, or switch quality/fast model.",
      };
    }

    return { error: status ? `${status} ${message}` : message };
  }

  // Decode the returned image (OpenRouter may return either a data URL or an https URL).
  // Note: some providers return very large base64 strings; parsing them with regex/Buffer can
  // trigger V8 stack/memory issues. Using fetch() for data URLs is more robust.
  let bytes: Uint8Array;
  let contentType = "image/png";
  let extension = "png";
  try {
    if (/^data:image\//.test(dataUrl)) {
      const res = await fetch(dataUrl);
      if (!res.ok) {
        return { error: `Failed to read generated image data URL (${res.status})` };
      }
      contentType = res.headers.get("content-type") ?? "image/png";
      const buf = await res.arrayBuffer();
      bytes = new Uint8Array(buf);
    } else if (/^https?:\/\//.test(dataUrl)) {
      const fetchResponse = await fetch(dataUrl);
      if (!fetchResponse.ok) {
        return { error: `Failed to download generated image (${fetchResponse.status})` };
      }
      contentType = fetchResponse.headers.get("content-type") ?? "image/png";
      const buf = await fetchResponse.arrayBuffer();
      bytes = new Uint8Array(buf);
    } else {
      return { error: `Unexpected image value returned (${dataUrl.slice(0, 60)}…)` };
    }

    extension =
      contentType === "image/webp"
        ? "webp"
        : contentType === "image/jpeg"
        ? "jpg"
        : "png";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to decode generated image";
    return { error: msg };
  }

  // Upload to Supabase Storage
  const fileName = `compass-generated/${imageAssetId}-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("season-images")
    .upload(fileName, bytes, {
      contentType,
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
      input: {
        prompt,
        enhancedPrompt,
        size,
        quality,
        referenceImagesUsed: referenceImageUrls.length,
      } as object,
      system_prompt_version: "generate-image-v2",
      output: {
        image_url: publicUrl,
        original_url: null,
        original_url_meta: {
          kind: dataUrl.startsWith("data:") ? "data_url" : dataUrl.startsWith("http") ? "http_url" : "unknown",
          prefix: dataUrl.slice(0, 48),
          length: dataUrl.length,
        },
      } as object,
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
