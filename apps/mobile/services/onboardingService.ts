/**
 * Finishes onboarding once the parent has an account: writes the team, the
 * explorers and the booked adventure slot. Idempotent enough to retry: explorers
 * that already exist (same name) are not duplicated.
 */
import type { SignUpPlayer } from "@/contexts/SignUpContext";
import { type AdventurePlan, type AdventurePlanDraft, saveAdventurePlan } from "@/services/adventurePlanService";
import { createProfile, getProfiles, getTeams, updateUserDataTeam } from "@/services/profileService";

export type OnboardingResult = {
  plan: AdventurePlan | null;
  firstExplorerName: string | null;
};

// The finish screen can mount more than once while auth routing settles; share one run per account.
const inFlight = new Map<string, Promise<OnboardingResult>>();

export function completeOnboarding(args: {
  userId: string;
  players: SignUpPlayer[];
  teamName: string;
  plan: AdventurePlanDraft | null;
}): Promise<OnboardingResult> {
  const existing = inFlight.get(args.userId);
  if (existing) return existing;
  const run = runOnboarding(args).finally(() => {
    setTimeout(() => inFlight.delete(args.userId), 5000);
  });
  inFlight.set(args.userId, run);
  return run;
}

async function runOnboarding({
  userId,
  players,
  teamName,
  plan,
}: {
  userId: string;
  players: SignUpPlayer[];
  teamName: string;
  plan: AdventurePlanDraft | null;
}): Promise<OnboardingResult> {
  const teams = await getTeams();
  const team = teams.find((t) => t.name.toLowerCase() === teamName.toLowerCase()) ?? teams[0];
  if (!team) throw new Error("Teams could not be loaded. Please try again in a moment.");
  await updateUserDataTeam(userId, team.id);

  const existing = await getProfiles(userId);
  const existingNames = new Set(existing.map((p) => p.name.trim().toLowerCase()));
  for (const player of players) {
    if (existingNames.has(player.name.trim().toLowerCase())) continue;
    await createProfile({ user_id: userId, name: player.name, colour: player.colour, nickname: player.nickname });
  }

  let saved: AdventurePlan | null = null;
  if (plan) {
    try {
      saved = await saveAdventurePlan(userId, plan);
    } catch (e) {
      // A missing plan must never block a family from getting in.
      console.warn("saveAdventurePlan failed", e);
    }
  }

  return { plan: saved, firstExplorerName: players[0]?.name ?? existing[0]?.name ?? null };
}
