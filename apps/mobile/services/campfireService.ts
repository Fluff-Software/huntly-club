import { supabase } from "./supabase";

export type CampfireSessionStatus =
  | "draft"
  | "scheduled"
  | "live"
  | "replay"
  | "archived";

export type CampfireComponentType =
  | "audio"
  | "video"
  | "captain"
  | "subtitle"
  | "mission_card"
  | "submission";

export type AudioComponentData = { audioUrl?: string };
export type CaptainComponentData = { captainId?: number; captainSlug?: string };
export type SubtitleComponentData = { text?: string };
export type MissionCardComponentData = { activityId?: number };
export type SubmissionComponentData = { photoId?: number };
export type VideoComponentData = {
  videoUrl?: string;
  displayMode?: "card" | "fullscreen";
  videoRatio?: "square" | "landscape" | "portrait" | "original";
  maximize?: "width" | "height";
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
  title: string;
  status: CampfireSessionStatus;
  scheduled_at: string | null;
  duration: number | null;
  description: string | null;
  thumbnail_url: string | null;
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
};

export type ApprovedPhotoOption = {
  photo_id: number;
  photo_url: string;
  activity_id: number | null;
  activity_title: string | null;
  nickname: string | null;
};

export type CampfireSessionBundle = {
  session: CampfireSessionRow;
  tracks: CampfireTrackRow[];
  components: CampfireComponentRow[];
  activities: ActivityOption[];
  captains: CaptainOption[];
  approvedPhotos: ApprovedPhotoOption[];
};

/** Built-in captains shipped with the app, mirrored from the admin editor. */
export const CAMPFIRE_BUILTIN_CAPTAINS: CaptainOption[] = [
  { id: -100, slug: "oli", name: "Oli", avatar_url: null },
  { id: -101, slug: "bella", name: "Bella", avatar_url: null },
  { id: -102, slug: "felix", name: "Felix", avatar_url: null },
];

const SESSION_COLUMNS =
  "id, title, status, scheduled_at, duration, description, thumbnail_url";

/** Campfire stage captain art: `season-images/captains/camp-{slug}.webp`. */
export function getCampfireCaptainImageUrl(slug: string): string | null {
  const normalized = slug?.toLowerCase().trim();
  if (!normalized) return null;
  const { data } = supabase.storage
    .from("season-images")
    .getPublicUrl(`captains/camp-${normalized}.webp`);
  return data.publicUrl;
}

/**
 * Returns the most recent campfire session in "replay" status, or null.
 * "Most recent" = latest scheduled_at, falling back to most recently created.
 */
export async function getLatestReplaySession(): Promise<CampfireSessionRow | null> {
  const { data, error } = await supabase
    .from("campfire_sessions")
    .select(SESSION_COLUMNS)
    .eq("status", "replay")
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load latest replay campfire session:", error);
    return null;
  }
  return (data as CampfireSessionRow | null) ?? null;
}

function uniqueNumbers(values: (number | null | undefined)[]): number[] {
  return Array.from(
    new Set(values.filter((v): v is number => typeof v === "number"))
  );
}

async function fetchActivities(ids: number[]): Promise<ActivityOption[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("activities")
    .select("id, title, description, image, xp")
    .in("id", ids);
  if (error) {
    console.error("Failed to load campfire activities:", error);
    return [];
  }
  return (data ?? []) as ActivityOption[];
}

async function fetchCaptains(
  ids: number[],
  slugs: string[]
): Promise<CaptainOption[]> {
  const dbIds = ids.filter((id) => id > 0);
  if (dbIds.length === 0 && slugs.length === 0) return [];

  // Build an OR filter for ids and slugs that were actually referenced.
  const filters: string[] = [];
  if (dbIds.length > 0) filters.push(`id.in.(${dbIds.join(",")})`);
  if (slugs.length > 0) {
    const escaped = slugs.map((s) => `"${s}"`).join(",");
    filters.push(`slug.in.(${escaped})`);
  }

  const query = supabase.from("captains").select("id, slug, name, avatar_url");
  const { data, error } = await (filters.length > 0
    ? query.or(filters.join(","))
    : query);

  if (error) {
    console.error("Failed to load campfire captains:", error);
    return [];
  }
  return (data ?? []) as CaptainOption[];
}

async function fetchApprovedPhotos(
  ids: number[]
): Promise<ApprovedPhotoOption[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("user_activity_photos")
    .select(
      `photo_id, photo_url, activity_id, activities ( title ), profiles ( nickname )`
    )
    .eq("status", 1)
    .in("photo_id", ids);

  if (error) {
    console.error("Failed to load campfire submission photos:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const activities = row.activities as
      | { title: string | null }
      | { title: string | null }[]
      | null;
    const profiles = row.profiles as
      | { nickname: string | null }
      | { nickname: string | null }[]
      | null;
    const act = Array.isArray(activities) ? activities[0] : activities;
    const prof = Array.isArray(profiles) ? profiles[0] : profiles;
    return {
      photo_id: row.photo_id as number,
      photo_url: row.photo_url as string,
      activity_id: (row.activity_id as number | null) ?? null,
      activity_title: act?.title ?? null,
      nickname: prof?.nickname ?? null,
    };
  });
}

/** Merge DB captains with the built-in set, avoiding duplicates by slug. */
function mergeCaptains(dbCaptains: CaptainOption[]): CaptainOption[] {
  const dbSlugs = new Set(dbCaptains.map((c) => c.slug.toLowerCase()));
  const builtIn = CAMPFIRE_BUILTIN_CAPTAINS.filter(
    (c) => !dbSlugs.has(c.slug)
  );
  return [...dbCaptains, ...builtIn];
}

/**
 * Loads everything needed to play a campfire session: tracks, components, and
 * the referenced activities, captains, and approved submission photos.
 */
export async function getCampfireSessionBundle(
  sessionId: number
): Promise<CampfireSessionBundle | null> {
  const [sessionRes, tracksRes, componentsRes] = await Promise.all([
    supabase
      .from("campfire_sessions")
      .select(SESSION_COLUMNS)
      .eq("id", sessionId)
      .maybeSingle(),
    supabase
      .from("campfire_session_tracks")
      .select("id, session_id, name, type, position")
      .eq("session_id", sessionId)
      .order("position", { ascending: true }),
    supabase
      .from("campfire_session_components")
      .select("id, session_id, track_id, type, start_time, duration, data")
      .eq("session_id", sessionId)
      .order("start_time", { ascending: true }),
  ]);

  if (sessionRes.error || !sessionRes.data) {
    console.error("Failed to load campfire session:", sessionRes.error);
    return null;
  }
  if (tracksRes.error) {
    console.error("Failed to load campfire tracks:", tracksRes.error);
    return null;
  }
  if (componentsRes.error) {
    console.error("Failed to load campfire components:", componentsRes.error);
    return null;
  }

  const components = (componentsRes.data ?? []) as CampfireComponentRow[];

  const activityIds = uniqueNumbers(
    components
      .filter((c) => c.type === "mission_card")
      .map((c) => (c.data as MissionCardComponentData).activityId)
  );
  const photoIds = uniqueNumbers(
    components
      .filter((c) => c.type === "submission")
      .map((c) => (c.data as SubmissionComponentData).photoId)
  );
  const captainComps = components.filter((c) => c.type === "captain");
  const captainIds = uniqueNumbers(
    captainComps.map((c) => (c.data as CaptainComponentData).captainId)
  );
  const captainSlugs = Array.from(
    new Set(
      captainComps
        .map((c) => (c.data as CaptainComponentData).captainSlug)
        .filter((s): s is string => typeof s === "string" && s.length > 0)
    )
  );

  const [activities, dbCaptains, approvedPhotos] = await Promise.all([
    fetchActivities(activityIds),
    fetchCaptains(captainIds, captainSlugs),
    fetchApprovedPhotos(photoIds),
  ]);

  return {
    session: sessionRes.data as CampfireSessionRow,
    tracks: (tracksRes.data ?? []) as CampfireTrackRow[],
    components,
    activities,
    captains: mergeCaptains(dbCaptains),
    approvedPhotos,
  };
}

/**
 * Collects the remote media URLs in a session so they can be prefetched before
 * playback starts.
 */
export function collectMediaUrls(bundle: CampfireSessionBundle): {
  images: string[];
  audio: string[];
} {
  const images = new Set<string>();
  const audio = new Set<string>();

  for (const a of bundle.activities) {
    if (a.image) images.add(a.image);
  }
  for (const p of bundle.approvedPhotos) {
    if (p.photo_url) images.add(p.photo_url);
  }
  for (const c of bundle.captains) {
    const campUrl = c.slug ? getCampfireCaptainImageUrl(c.slug) : null;
    if (campUrl) images.add(campUrl);
    else if (c.avatar_url) images.add(c.avatar_url);
  }
  for (const comp of bundle.components) {
    if (comp.type === "audio") {
      const url = (comp.data as AudioComponentData).audioUrl?.trim();
      if (url) audio.add(url);
    }
  }

  return { images: Array.from(images), audio: Array.from(audio) };
}

/** Total session length in ms, derived from the components if not stored. */
export function sessionDurationMs(bundle: CampfireSessionBundle): number {
  const fromComponents = bundle.components.reduce(
    (max, c) => Math.max(max, c.start_time + c.duration),
    0
  );
  return Math.max(bundle.session.duration ?? 0, fromComponents);
}
