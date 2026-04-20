export const START_MISSION_STEP = {
  NOT_STARTED: 0,
  WELCOME: 1,
  TEASER: 2,
  STORY: 3,
  MISSION_INTRO: 4,
  MISSION_IN_PROGRESS: 5,
  MISSION_COMPLETE: 6,
} as const;

export const START_MISSION_FINAL_STEP = START_MISSION_STEP.MISSION_COMPLETE;

export function isStartMissionOnboardingActive(step: number | null | undefined): boolean {
  return (step ?? START_MISSION_STEP.NOT_STARTED) < START_MISSION_FINAL_STEP;
}
