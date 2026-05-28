export const CAMPFIRE_STATUSES = [
  "draft",
  "scheduled",
  "live",
  "replay",
  "archived",
] as const;

export type CampfireSessionStatus = (typeof CAMPFIRE_STATUSES)[number];

export const CAMPFIRE_COMPONENT_TYPES = [
  "audio",
  "video",
  "captain",
  "subtitle",
  "mission_card",
  "submission",
] as const;

export type CampfireComponentType = (typeof CAMPFIRE_COMPONENT_TYPES)[number];

export type AudioComponentData = {
  audioUrl?: string;
};

export type CaptainComponentData = {
  captainId?: number;
  captainSlug?: string;
};

export type SubtitleComponentData = {
  text?: string;
};

export type MissionCardComponentData = {
  activityId?: number;
};

export type VideoComponentData = {
  videoUrl?: string;
  displayMode?: "card" | "fullscreen";
  videoRatio?: "square" | "landscape" | "portrait" | "original";
  /**
   * Only used when displayMode === "fullscreen".
   * - width: scale so video width matches preview width (height may overflow/letterbox)
   * - height: scale so video height matches preview height (width may overflow/letterbox)
   */
  maximize?: "width" | "height";
};

export type SubmissionComponentData = {
  photoId?: number;
};

export type CampfireComponentData =
  | AudioComponentData
  | VideoComponentData
  | CaptainComponentData
  | SubtitleComponentData
  | MissionCardComponentData
  | SubmissionComponentData;

export type CampfireSessionRow = {
  id: number;
  created_at: string;
  updated_at: string;
  title: string;
  status: CampfireSessionStatus;
  scheduled_at: string | null;
  duration: number | null;
  description: string | null;
  thumbnail_url: string | null;
  missions: number[];
};

export type CampfireTrackRow = {
  id: number;
  session_id: number;
  name: string;
  type: CampfireComponentType;
  position: number;
};

export type CampfireComponentRow = {
  id: number;
  session_id: number;
  track_id: number;
  type: CampfireComponentType;
  start_time: number;
  duration: number;
  data: CampfireComponentData;
};

export type ActivityOption = {
  id: number;
  name: string;
  title: string;
  description: string | null;
  image: string | null;
  xp: number | null;
};

export type CaptainOption = {
  id: number;
  slug: string;
  name: string;
  avatar_url: string | null;
  pose_options: string[] | null;
};

export type ApprovedPhotoOption = {
  photo_id: number;
  photo_url: string;
  activity_id: number | null;
  activity_title: string | null;
  nickname: string | null;
};

export type EditorSnapshot = {
  tracks: CampfireTrackRow[];
  components: CampfireComponentRow[];
};

export const PALETTE_ITEMS: {
  type: CampfireComponentType;
  label: string;
}[] = [
  { type: "audio", label: "Audio" },
  { type: "video", label: "Video" },
  { type: "captain", label: "Captain" },
  { type: "subtitle", label: "Subtitle" },
  { type: "mission_card", label: "Mission Cards" },
  { type: "submission", label: "Submission" },
];

/** DB requires a type on track rows; layers are type-agnostic in the UI. */
export const LAYER_DB_TYPE_PLACEHOLDER: CampfireComponentType = "audio";

export const DEFAULT_LAYER_COUNT = 5;

export function defaultLayerSeedRows(sessionId: number): {
  session_id: number;
  name: string;
  type: CampfireComponentType;
  position: number;
}[] {
  return Array.from({ length: DEFAULT_LAYER_COUNT }, (_, i) => ({
    session_id: sessionId,
    name: `Layer ${i + 1}`,
    type: LAYER_DB_TYPE_PLACEHOLDER,
    position: i,
  }));
}

export const COMPONENT_TYPE_LABELS: Record<CampfireComponentType, string> = {
  audio: "Audio",
  video: "Video",
  captain: "Captain",
  subtitle: "Subtitle",
  mission_card: "Mission Cards",
  submission: "Submission",
};

export const CAMPFIRE_CAPTAINS: CaptainOption[] = [
  { id: -100, slug: "oli", name: "Oli", avatar_url: "/captains/oli.png", pose_options: ["standing", "waving"] },
  { id: -101, slug: "bella", name: "Bella", avatar_url: "/captains/bella.png", pose_options: ["standing", "waving"] },
  { id: -102, slug: "felix", name: "Felix", avatar_url: "/captains/felix.png", pose_options: ["standing", "waving"] },
];

/** Merge DB captains with built-in campfire captains, avoiding duplicates by slug. */
export function getCampfireCaptains(dbCaptains: CaptainOption[]): CaptainOption[] {
  const dbSlugs = new Set(dbCaptains.map((c) => c.slug.toLowerCase()));
  const builtIn = CAMPFIRE_CAPTAINS.filter((c) => !dbSlugs.has(c.slug));
  return [...dbCaptains, ...builtIn];
}
