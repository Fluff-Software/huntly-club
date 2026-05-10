export type Captain = {
  slug: string;
  name: string;
  team: "Bears" | "Foxes" | "Otters";
  character: string;
  voiceGuide: string;
  imageAnchors: string;
  paletteColor: string;
};

export const CAPTAINS: Captain[] = [
  {
    slug: "bella",
    name: "Bella",
    team: "Bears",
    paletteColor: "orange",
    character:
      "Brave, welcoming, steady. Natural organiser with 'let's get going' energy. Good at rallying people and getting them moving. Not a talker — a doer.",
    voiceGuide:
      "Direct and action-first. Inspires confidence through calm certainty rather than speeches. Short sentences. Gets to the point. Uses words like 'right', 'let's go', 'here's what we do'. Never melodramatic. Warm but not gushing.",
    imageAnchors:
      "orange clothing, blonde or light brown hair in ponytail, outdoors gear, friendly capable expression, often shown with a map, compass, or practical kit",
  },
  {
    slug: "felix",
    name: "Felix",
    team: "Foxes",
    paletteColor: "blue",
    character:
      "Curious, clever, confident. Planner and puzzle-solver energy. Notices systems, clues, and strategy. Has a notebook for everything.",
    voiceGuide:
      "Precise and interesting. Shares observations and theories. Asks questions that make you think. Slightly more complex vocabulary but never shows off. Uses words like 'interesting', 'I've been tracking', 'here's what I noticed'. Enthusiastic about patterns and details.",
    imageAnchors:
      "blue clothing, dark tousled hair, notebook or pencil or map props, confident thoughtful expression",
  },
  {
    slug: "oli",
    name: "Oli",
    team: "Otters",
    paletteColor: "green",
    character:
      "Playful, observant, upbeat. Spots detail and notices what others miss. More 'look closely' / discovery energy. Finds joy in small things.",
    voiceGuide:
      "Warm and enthusiastic. Notices small things and makes them feel significant. Light, quick, full of energy without being loud. Uses words like 'wait', 'did you see that', 'look at this one'. Short bursts of excitement. Never cynical.",
    imageAnchors:
      "green clothing, darker skin, short curly hair, magnifying glass or binoculars or observational props, warm playful expression",
  },
];

export function getCaptainBySlug(slug: string): Captain | undefined {
  return CAPTAINS.find((c) => c.slug === slug);
}

export function getCaptainByTeam(team: Captain["team"]): Captain | undefined {
  return CAPTAINS.find((c) => c.team === team);
}

export function getCaptainsVoiceContext(captainSlug?: string): string {
  if (captainSlug) {
    const captain = getCaptainBySlug(captainSlug);
    if (captain) {
      return `\nFeatured captain for this content: ${captain.name} (${captain.team}).\nVoice guide: ${captain.voiceGuide}`;
    }
  }
  return "";
}

export function getCaptainReferenceImageUrl(slug: string): string | null {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/season-images/captains/${slug}.webp`;
}

export function detectCaptainsInPrompt(prompt: string): Captain[] {
  const lower = prompt.toLowerCase();
  return CAPTAINS.filter((c) => lower.includes(c.name.toLowerCase()));
}
