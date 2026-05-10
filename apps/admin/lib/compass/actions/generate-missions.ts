"use server";

import { COMPASS_MODELS } from "../client";
import { runCompassAction, type CompassActionResult } from "../run-action";
import { stripCodeFences } from "../parse-utils";

export type GeneratedMission = {
  name: string;
  title: string;
  description: string;
  mission_type: "outdoor" | "indoor" | "hybrid";
  estimated_duration?: string;
  optional_items?: string;
  intro_character_name?: string;
  intro_captain?: string;
  intro_captain_pose?: string;
  intro_dialogue?: string;
  preparation_message?: string;
  reminder_message?: string;
  prep_checklist?: Array<{ title: string; description: string }>;
  steps?: Array<{ instruction: string; tip?: string; media_url?: string }>;
  debrief_heading?: string;
  debrief_photo_label?: string;
  safety_notes?: string;
  debrief_question_1?: string;
  debrief_question_2?: string;
  xp?: number;
};

type Input = {
  seasonBrief: string;
  captainSlug?: string;
  chapterTitle: string;
  chapterSummary: string;
  targetAgeMin: number;
  targetAgeMax: number;
  outdoorCount?: number;
  indoorCount?: number;
};

const SYSTEM_PROMPT_VERSION = "generate-missions-v3";

export async function generateMissions(
  input: Input,
  createdBy?: string
): Promise<CompassActionResult<GeneratedMission[]>> {
  const outdoorCount = input.outdoorCount ?? 2;
  const indoorCount = input.indoorCount ?? 1;
  const totalCount = outdoorCount + indoorCount;

  const captainNote = input.captainSlug
    ? `The featured captain for this chapter is ${input.captainSlug}. Write intro_captain_dialogue in their distinct voice as described in the world guide above.`
    : `Use Bella, Felix, or Oli for captain dialogue as fits the mission. Keep their voices distinct.`;

  const system = `You are Compass, the mission designer for Huntly World.
You design safe, real-world outdoor and indoor missions for children aged ${input.targetAgeMin}–${input.targetAgeMax}.
Missions must feel like genuine club adventures — not worksheets. They connect to the season story and encourage real exploration and noticing.
${captainNote}
You always respond with valid JSON only — no prose, no markdown fences.

Season brief:
${input.seasonBrief}`;

  const messages = [
    {
      role: "user" as const,
      content: `Design ${totalCount} missions for the chapter "${input.chapterTitle}".

Chapter summary: ${input.chapterSummary}
Mix: ${outdoorCount} outdoor + ${indoorCount} indoor mission(s).

Return a JSON array of exactly ${totalCount} mission objects in the SAME SHAPE used by our mission editor form.

Each mission object must include:
- name: snake_case slug (e.g. "cloud_stories"). No timestamps.
- title: display title
- description: short child-facing description (1–2 sentences)
- mission_type: "outdoor", "indoor", or "hybrid"
- estimated_duration: e.g. "20–30 minutes"
- optional_items: comma-separated optional items (no "Required:" prefix)
- intro_character_name: e.g. "Ollie Otter" (what shows in the name override field)
- intro_captain: one of "bella" | "felix" | "oli" | null (or omit)
- intro_captain_pose: e.g. "standing" (or omit)
- intro_dialogue: 1–3 sentences from the captain (speech bubble)
- prep_checklist: array of 3–6 items { title, description } describing "Before you start…" (not just a supplies list)
- steps: array of 4–6 items { instruction, tip?, media_url? } (instruction is required; tip is optional)
- debrief_heading: e.g. "Report Back to Ollie"
- debrief_photo_label: e.g. "Show Ollie your cloud drawings"
- debrief_question_1 and debrief_question_2
- safety_notes: 1–2 sentences, practical and calm
- xp: number (10–40)

Do NOT include fields we didn't ask for. Use empty strings only if truly necessary; prefer omitting optional keys.

Respond with the JSON array only.`,
    },
  ];

  return runCompassAction<Input, GeneratedMission[]>({
    action: "generate_missions",
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
      return parsed as GeneratedMission[];
    },
  });
}
