"use server";

import { COMPASS_MODELS } from "../client";
import { runCompassAction, type CompassActionResult } from "../run-action";
import { stripCodeFences } from "../parse-utils";

type Input = {
  seasonBrief: string;
  chapterTitle?: string;
  chapterSummary?: string;
  targetAgeMin: number;
  targetAgeMax: number;
  mission: {
    title: string;
    description?: string;
    mission_type?: string | null;
    estimated_duration?: string;
    safety_notes?: string;
    optional_items?: string;
    steps?: Array<{ instruction?: string; tip?: string }>;
    supplies?: Array<{ name?: string; required?: boolean; note?: string }>;
  };
};

type Output = { prompt: string };

const SYSTEM_PROMPT_VERSION = "generate-mission-cover-prompt-v1";

export async function generateMissionCoverPrompt(
  input: Input,
  createdBy?: string
): Promise<CompassActionResult<Output>> {
  const system = `You are Compass, Huntly World's visual prompt writer.
You write image prompts for a single 16:9 mission cover image based on the mission content.
Audience is children aged ${input.targetAgeMin}–${input.targetAgeMax}; the image must be safe, realistic, and match the Huntly adventure brand world.
Mission cover images must NOT include any characters or people (no children, no captains, no humans, no faces, no bodies). Focus on environment, props, and mission artifacts only.
You always respond with valid JSON only — no prose, no markdown fences.

Season brief:
${input.seasonBrief}`;

  const messages = [
    {
      role: "user" as const,
      content: `Given this mission, write ONE image prompt string for the mission cover image.

Constraints:
- Output JSON: {"prompt": "..."} only.
- The prompt should describe a single scene that clearly communicates the mission.
- Composition must be 16:9 (wide).
- No text, no logos, no watermarks, no UI elements.
- No characters or people: do not include children, captains, humans, faces, hands, silhouettes, or crowds.
- If the mission text mentions captains/characters, IGNORE them and replace with objects/setting that conveys the mission instead.
- Do NOT mention or request reference images.
- Avoid naming specific real people; keep it generic and safe.

Optional context:
Chapter title: ${input.chapterTitle ?? ""}
Chapter summary: ${input.chapterSummary ?? ""}

Mission JSON:
${JSON.stringify(input.mission)}`,
    },
  ];

  return runCompassAction<Input, Output>({
    action: "generate_mission_cover_prompt",
    entityType: "activity",
    model: COMPASS_MODELS.default,
    systemPromptVersion: SYSTEM_PROMPT_VERSION,
    system,
    messages,
    input,
    createdBy,
    parseOutput: (raw) => {
      const parsed = JSON.parse(stripCodeFences(raw)) as Partial<Output>;
      const prompt = typeof parsed.prompt === "string" ? parsed.prompt.trim() : "";
      if (!prompt) throw new Error("Expected {prompt: string}");
      return { prompt };
    },
  });
}

