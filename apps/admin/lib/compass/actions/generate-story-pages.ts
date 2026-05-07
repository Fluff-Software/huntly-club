"use server";

import { COMPASS_MODELS } from "../client";
import { runCompassAction, type CompassActionResult } from "../run-action";
import { stripCodeFences } from "../parse-utils";

export type StorySlide = {
  type: "text" | "image" | "text-image";
  value: string;
  image?: string;
  image_prompt?: string;
};

type Input = {
  seasonBrief: string;
  captainSlug?: string;
  chapterTitle: string;
  chapterSummary: string;
  arcPosition: string;
  targetAgeMin: number;
  targetAgeMax: number;
  slideCount?: number;
};

const SYSTEM_PROMPT_VERSION = "generate-story-pages-v2";

export async function generateStoryPages(
  input: Input,
  createdBy?: string
): Promise<CompassActionResult<StorySlide[]>> {
  const slideCount = input.slideCount ?? 5;

  const captainNote = input.captainSlug
    ? `The featured captain for this chapter is ${input.captainSlug}. Write their dialogue and lines in their distinct voice as described in the world guide above.`
    : `Any of the three captains (Bella, Felix, Oli) may appear. Keep their voices distinct.`;

  const system = `You are Compass, the story writer for Huntly World.
You write story slides for children aged ${input.targetAgeMin}–${input.targetAgeMax}.
Each slide should be short, confident, lightly mysterious, and always lead toward outdoor action or discovery.
${captainNote}
You always respond with valid JSON only — no prose, no markdown fences.

Season brief:
${input.seasonBrief}`;

  const messages = [
    {
      role: "user" as const,
      content: `Write ${slideCount} story slides for the chapter "${input.chapterTitle}".

Chapter summary: ${input.chapterSummary}
Arc position: ${input.arcPosition}

Return a JSON array of exactly ${slideCount} slide objects. Each must have:
- type: one of "text", "image", or "text-image"
- value: the story text (2–4 short sentences, age-appropriate, active voice, no over-explanation)
- image_prompt: REQUIRED only when type is "image" or "text-image". Omit image_prompt entirely for "text" slides.

Image prompt rules:
- If a captain appears in the scene, refer to them ONLY by name: "Bella", "Felix", or "Oli".
- If multiple captains appear, explicitly list their names (e.g. "Bella and Felix", "Felix and Oli", "Bella, Oli, and Felix"). Do NOT use generic phrases like "a group of explorers" or "three young people".
- Do NOT describe the captain's physical appearance (hair, clothes, facial features, etc). Character consistency is handled later.
- Focus the image_prompt on the setting, action, mood, lighting, and key objects.

Use a mix of types. Start with "text", use "text-image" for dramatic moments, "image" sparingly.

Respond with the JSON array only.`,
    },
  ];

  return runCompassAction<Input, StorySlide[]>({
    action: "generate_story_pages",
    entityType: "chapter",
    model: COMPASS_MODELS.default,
    systemPromptVersion: SYSTEM_PROMPT_VERSION,
    system,
    messages,
    input,
    createdBy,
    parseOutput: (raw) => {
      const parsed = JSON.parse(stripCodeFences(raw));
      if (!Array.isArray(parsed)) throw new Error("Expected JSON array");
      return parsed as StorySlide[];
    },
  });
}
