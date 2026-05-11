import OpenAI from "openai";

export const COMPASS_MODELS = {
  // Text — Claude via OpenRouter
  default: "anthropic/claude-sonnet-4-6",
  utility: "anthropic/claude-haiku-4-5-20251001",
  // Image generation via OpenRouter
  imageFast: "black-forest-labs/flux.2-klein-4b",
  imageQuality: "black-forest-labs/flux.2-pro",
} as const;

export type CompassModel = (typeof COMPASS_MODELS)[keyof typeof COMPASS_MODELS];

// Approximate cost per 1M tokens (text) or per image (image models)
export const MODEL_COSTS: Record<CompassModel, { input: number; output: number } | { perImage: number }> = {
  [COMPASS_MODELS.default]: { input: 3.0, output: 15.0 },
  [COMPASS_MODELS.utility]: { input: 0.8, output: 4.0 },
  // Approximate; OpenRouter/BFL pricing is per-megapixel for flux.2 models
  [COMPASS_MODELS.imageFast]: { perImage: 0.014 },
  [COMPASS_MODELS.imageQuality]: { perImage: 0.03 },
};

export function createCompassClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://huntly.world",
      "X-Title": "Huntly Season Builder",
    },
  });
}

export function calcTextCostUsd(
  model: CompassModel,
  tokensIn: number,
  tokensOut: number
): number {
  const rates = MODEL_COSTS[model];
  if ("perImage" in rates) return rates.perImage;
  return (tokensIn * rates.input + tokensOut * rates.output) / 1_000_000;
}

export function isImageModel(model: CompassModel): boolean {
  return model === COMPASS_MODELS.imageFast || model === COMPASS_MODELS.imageQuality;
}
