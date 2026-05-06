"use server";

import { COMPASS_MODELS } from "../client";
import { runCompassAction, type CompassActionResult } from "../run-action";
import { stripCodeFences } from "../parse-utils";

export type MissionStep = {
  order: number;
  title: string;
  instruction: string;
  tip?: string;
  captain_line?: string;
  duration_minutes?: number;
  image_prompt?: string;
};

export type Supply = {
  name: string;
  required: boolean;
  note?: string;
};

export type GeneratedMission = {
  name: string;
  title: string;
  description: string;
  mission_type: "outdoor" | "indoor" | "hybrid";
  estimated_duration: string;
  safety_notes: string;
  supplies: Supply[];
  steps: MissionStep[];
  intro_captain_dialogue?: string;
  debrief_question_1?: string;
  debrief_question_2?: string;
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

const SYSTEM_PROMPT_VERSION = "generate-missions-v2";

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

Return a JSON array of exactly ${totalCount} mission objects. Each must have:
- name: short slug-style identifier (e.g. "trail-markers")
- title: engaging display title
- description: 2–3 sentence mission brief written directly to the child — active, exciting, grounded
- mission_type: "outdoor", "indoor", or "hybrid"
- estimated_duration: e.g. "20–30 minutes"
- safety_notes: 1–2 sentences of practical age-appropriate safety guidance (not scary, not preachy)
- supplies: array of { name, required (bool), note? }
- steps: array of 4–6 steps, each with { order, title, instruction, tip?, captain_line?, duration_minutes?, image_prompt? }
- intro_captain_dialogue: 1–2 sentences from the captain briefing the explorer — in their distinct voice
- debrief_question_1: open-ended reflection question about what they noticed or discovered
- debrief_question_2: second reflection question

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
