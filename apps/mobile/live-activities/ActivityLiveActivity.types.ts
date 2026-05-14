export type ActivityLiveActivityProps = {
  sessionId: string;
  activityType: "walk" | "cycle";
  title: string;
  distance: string;
  elapsed: string;
  steps: string | null;
  /** When true, show completion styling (e.g. after ending the session). */
  isComplete: boolean;
  /** Host app color scheme at update time; Live Activity UI adapts its palette. */
  colorScheme: "light" | "dark";
};
