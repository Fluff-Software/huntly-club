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
  refinement?: {
    previousMissions: GeneratedMission[];
    prompt: string;
  };
};

const SYSTEM_PROMPT_VERSION = "generate-missions-v4";

export async function generateMissions(
  input: Input,
  createdBy?: string
): Promise<CompassActionResult<GeneratedMission[]> & { input: Input }> {
  const outdoorCount = input.outdoorCount ?? 2;
  const indoorCount = input.indoorCount ?? 1;
  const totalCount = outdoorCount + indoorCount;

  const captainNote = input.captainSlug
    ? `The featured captain for this chapter is ${input.captainSlug}. Write intro_captain_dialogue in their distinct voice as described in the world guide above.`
    : `Use Bella, Felix, or Oli for captain dialogue as fits the mission. Keep their voices distinct.`;

  const system = `You are Compass, the mission designer for Huntly World.
You design specific, substantial, real-world missions for children aged ${input.targetAgeMin}–${input.targetAgeMax}.
${captainNote}
You always respond with valid JSON only — no prose, no markdown fences.

## What makes a great Huntly mission

A great mission is SPECIFIC and CONCRETE. Not "go explore nature" — but "build a tiny woodland home for a hedgehog using only what you find on the ground". Not "make something" — but "tea-stain a piece of paper, let it dry, then draw a fantasy map of your local area with invented place names". The activity itself should be instantly vivid in a child's head.

A great mission takes a focused 8-year-old between 45 and 90 minutes. It should feel substantial — something they'd want to tell someone about afterwards — but achievable in one session without specialist equipment or adult expertise.

Missions span a wide range of types. Examples of the KIND of specificity we want (do not reuse these verbatim — invent your own tied to the chapter):
- Build a miniature woodland den or creature home using only natural materials found in the garden or park
- Create a working periscope from two small mirrors and a cardboard tube, then use it to spy on something from around a corner
- Design and build a bridge from lolly sticks and glue that can hold the weight of a tin of beans
- Make a fantasy map of your local area: tea-stain the paper first, let it dry, then draw with ink adding invented names and symbols
- Set up a bug hotel from bamboo, bark and pinecones and record who moves in over a week
- Run a proper weather station for an afternoon: measure cloud type, wind direction (using a homemade vane), and temperature every 15 minutes and chart the results
- Write and send a real letter to someone they admire — researching the address, writing in good handwriting, and including a hand-drawn illustration
- Build an indoor base / headquarters with a specific theme, adding functional elements (a message drop, a map wall, a watch rota)

Vary the TYPE across missions: outdoor exploration, STEM/building, creative/arts, nature study, writing/communication, indoor construction. Never give all missions the same feel.

Steps should be GUIDED — each step is a clear, do-this-now instruction (not a vague prompt). A child should be able to read step 3 and know exactly what to do without asking an adult.

Season brief:
${input.seasonBrief}`;

  let refinementContext = "";
  if (input.refinement) {
    refinementContext = `
IMPORTANT: You are refining previously generated missions.
Here are the previous missions:
\`\`\`json
${JSON.stringify(input.refinement.previousMissions, null, 2)}
\`\`\`
The user has provided the following refinement feedback. You must adjust the missions according to this feedback while keeping them valid:
FEEDBACK: "${input.refinement.prompt}"
`;
  }

  const messages = [
    {
      role: "user" as const,
      content: `Design ${totalCount} missions for the chapter "${input.chapterTitle}".

Chapter summary: ${input.chapterSummary}
Mix: ${outdoorCount} outdoor + ${indoorCount} indoor mission(s).
${refinementContext}
Each mission must be SPECIFIC to this chapter's theme — not generic. Invent a vivid, concrete activity that a child would immediately understand and want to do.

Return a JSON array of exactly ${totalCount} mission objects in the SAME SHAPE used by our mission editor form.

Each mission object must include:
- name: snake_case slug (e.g. "woodland_creature_home"). No timestamps.
- title: specific, evocative display title (not generic like "Nature Walk")
- description: 2–3 sentences, child-facing, that makes the mission sound exciting and tells them exactly what they'll be doing and making
- mission_type: "outdoor", "indoor", or "hybrid"
- estimated_duration: between "45–60 minutes" and "60–90 minutes"
- optional_items: comma-separated optional extras (no "Required:" prefix)
- intro_character_name: e.g. "Ollie Otter"
- intro_captain: one of "bella" | "felix" | "oli" | null (or omit)
- intro_captain_pose: e.g. "standing" (or omit)
- intro_dialogue: 2–4 sentences from the captain — enthusiastic, specific to this mission, hints at what they'll discover
- prep_checklist: array of 4–7 items { title, description } — "Before you start…" covering both gathering materials AND any preparation steps (e.g. "Tea-stain your paper", "Find your outdoor spot")
- steps: array of 6–9 items { instruction, tip? } — each instruction is a clear, specific, do-this-now action. Tips are optional encouragement or technique hints.
- debrief_heading: e.g. "Report Back to Ollie"
- debrief_photo_label: specific to what they made, e.g. "Show Ollie your finished creature home"
- debrief_question_1: reflective question about what they did or discovered
- debrief_question_2: imaginative or extension question
- safety_notes: 1–2 sentences, practical and calm
- xp: number (25–50, reflecting the substantial time investment)

Do NOT include fields we didn't ask for. Use empty strings only if truly necessary; prefer omitting optional keys.

Respond with the JSON array only.`,
    },
  ];

  const result = await runCompassAction<Input, GeneratedMission[]>({
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

  return { ...result, input };
}
