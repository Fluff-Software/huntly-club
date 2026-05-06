"use server";

import { COMPASS_MODELS } from "../client";
import { runCompassAction, type CompassActionResult } from "../run-action";
import { stripCodeFences } from "../parse-utils";

export type ChapterArcItem = {
  week_number: number;
  title: string;
  summary: string;
  arc_position: "setup" | "rising" | "midpoint" | "falling" | "climax" | "resolution";
  key_themes: string[];
};

type Input = {
  seasonBrief: string;
  seasonName: string;
  targetAgeMin: number;
  targetAgeMax: number;
};

const SYSTEM_PROMPT_VERSION = "generate-chapter-arc-v2";

export async function generateChapterArc(
  input: Input,
  createdBy?: string
): Promise<CompassActionResult<ChapterArcItem[]>> {
  const system = `You are Compass, the season planning tool for Huntly World.
You plan 12-chapter season arcs for children aged ${input.targetAgeMin}–${input.targetAgeMax}.
Each chapter should feel like a natural part of an ongoing club adventure — grounded in real outdoor activity, building week by week.
Captains (Bella, Felix, Oli) may appear in chapter summaries as briefers and participants, not as all-knowing guides.
You always respond with valid JSON only — no prose, no markdown fences.

Season brief:
${input.seasonBrief}`;

  const messages = [
    {
      role: "user" as const,
      content: `Plan a 12-chapter season arc for "${input.seasonName}".

Return a JSON array of exactly 12 chapter objects. Each object must have:
- week_number (1–12)
- title (short, engaging, age-appropriate — not a fantasy title)
- summary (one sentence describing what happens this chapter and what outdoor action it leads to)
- arc_position (one of: setup, rising, midpoint, falling, climax, resolution)
- key_themes (array of 2–4 theme keywords)

Distribute arc_positions naturally across 12 weeks (weeks 1–2 = setup, 3–5 = rising, 6 = midpoint, 7–9 = falling, 10–11 = climax, 12 = resolution).

Respond with the JSON array only.`,
    },
  ];

  return runCompassAction<Input, ChapterArcItem[]>({
    action: "generate_chapter_arc",
    entityType: "season",
    model: COMPASS_MODELS.default,
    systemPromptVersion: SYSTEM_PROMPT_VERSION,
    system,
    messages,
    input,
    createdBy,
    parseOutput: (raw) => {
      const parsed = JSON.parse(stripCodeFences(raw));
      if (!Array.isArray(parsed)) throw new Error("Expected JSON array");
      return parsed as ChapterArcItem[];
    },
  });
}
