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
export type CaptainAlignment = "left" | "middle" | "right";

export type CaptainComponentData = {
  captainId?: number;
  captainSlug?: string;
  alignment?: CaptainAlignment;
};
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
  live_started_at?: string | null;
  live_ended_at?: string | null;
  duration: number | null;
  description: string | null;
  thumbnail_url: string | null;
  show_viewer_count?: boolean;
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
  "id, title, status, scheduled_at, live_started_at, live_ended_at, duration, description, thumbnail_url, show_viewer_count";

/** Device clock + offset from last successful `get_server_now` RPC. */
let serverTimeOffsetMs: number | null = null;
let lastServerTimeSyncMs = 0;
let serverTimeSyncInFlight: Promise<void> | null = null;
let loggedServerTimeUnavailable = false;

const SERVER_TIME_REFRESH_MS = 30_000;
const SERVER_TIME_RETRY_AFTER_FAIL_MS = 60_000;

function serverNowMsFromCache(): number {
  return serverTimeOffsetMs != null
    ? Date.now() + serverTimeOffsetMs
    : Date.now();
}

function serverNowIsoFromCache(): string {
  return new Date(serverNowMsFromCache()).toISOString();
}

async function syncServerTimeOffset(): Promise<void> {
  const now = Date.now();
  if (
    serverTimeOffsetMs != null &&
    now - lastServerTimeSyncMs < SERVER_TIME_REFRESH_MS
  ) {
    return;
  }
  if (
    serverTimeOffsetMs == null &&
    lastServerTimeSyncMs > 0 &&
    now - lastServerTimeSyncMs < SERVER_TIME_RETRY_AFTER_FAIL_MS
  ) {
    return;
  }
  if (serverTimeSyncInFlight) {
    await serverTimeSyncInFlight;
    return;
  }

  const run = async () => {
    const { data, error } = await supabase.rpc("get_server_now");
    lastServerTimeSyncMs = Date.now();
    if (error) {
      if (!loggedServerTimeUnavailable) {
        loggedServerTimeUnavailable = true;
        console.warn(
          "Server time unavailable, using device clock:",
          error.message
        );
      }
      return;
    }
    const iso =
      typeof data === "string" ? data : (data as string | null) ?? null;
    if (!iso) return;
    loggedServerTimeUnavailable = false;
    serverTimeOffsetMs = Date.parse(iso) - Date.now();
  };

  serverTimeSyncInFlight = run();
  try {
    await serverTimeSyncInFlight;
  } finally {
    serverTimeSyncInFlight = null;
  }
}

/** Current time in ms (server-synced when available, otherwise device clock). */
export function getServerNowMs(): number {
  void syncServerTimeOffset();
  return serverNowMsFromCache();
}

export async function getServerNowIso(): Promise<string | null> {
  await syncServerTimeOffset();
  return serverNowIsoFromCache();
}

async function resolveServerNowMs(nowMs?: number): Promise<number> {
  if (nowMs !== undefined && !Number.isNaN(nowMs)) return nowMs;
  await syncServerTimeOffset();
  return serverNowMsFromCache();
}

/** Client hint: user finished watching this live session (before cron sets replay). */
let dismissedLiveSessionId: number | null = null;

export function dismissCampfireLiveSession(sessionId: number) {
  dismissedLiveSessionId = sessionId;
}

export function clearDismissedCampfireLiveSession() {
  dismissedLiveSessionId = null;
}

export function isCampfireLiveDismissed(sessionId: number): boolean {
  return dismissedLiveSessionId === sessionId;
}

/** Whether a row is still in its live broadcast window (matches pg_cron end rule). */
export function isCampfireSessionBroadcasting(
  session: CampfireSessionRow,
  nowMs: number = Date.now()
): boolean {
  if (session.status !== "live") return false;
  if (!session.live_started_at || session.duration == null) return true;
  const startedMs = Date.parse(session.live_started_at);
  if (Number.isNaN(startedMs)) return true;
  return nowMs < startedMs + session.duration;
}

export function shouldShowCampfireViewerCount(
  session: Pick<CampfireSessionRow, "show_viewer_count"> | null | undefined
): boolean {
  return session?.show_viewer_count ?? true;
}

export function resolveCampfireShowViewerCount(
  bundle: CampfireSessionBundle | null,
  waitingSession: CampfireSessionRow | null
): boolean {
  const sessionId = bundle?.session.id ?? waitingSession?.id ?? null;
  if (sessionId == null) return true;
  if (waitingSession?.id === sessionId) {
    return shouldShowCampfireViewerCount(waitingSession);
  }
  return shouldShowCampfireViewerCount(bundle?.session);
}

/**
 * Returns the most recent campfire session still broadcasting live, or null.
 */
export async function getLatestLiveSession(): Promise<CampfireSessionRow | null> {
  const { data, error } = await supabase
    .from("campfire_sessions")
    .select(SESSION_COLUMNS)
    .eq("status", "live")
    .order("live_started_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load latest live campfire session:", error);
    return null;
  }
  const row = (data as CampfireSessionRow | null) ?? null;
  if (!row) {
    clearDismissedCampfireLiveSession();
    return null;
  }

  const nowIso = await getServerNowIso();
  const nowMs = nowIso ? Date.parse(nowIso) : Date.now();
  if (!isCampfireSessionBroadcasting(row, nowMs)) {
    clearDismissedCampfireLiveSession();
    return null;
  }
  if (isCampfireLiveDismissed(row.id)) {
    return null;
  }
  return row;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * After the countdown ends, resolve the session to play: live first, then poll
 * the session we were waiting for (cron may take up to ~1 min), never a stale replay.
 */
export async function resolveCampfirePlaybackSession(
  waitingSessionId?: number | null
): Promise<CampfireSessionRow | null> {
  const live = await getLatestLiveSession();
  if (live) return live;

  if (waitingSessionId == null) {
    return getLatestReplaySession();
  }

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const row = await getCampfireSessionById(waitingSessionId);
    if (row?.status === "live") return row;

    const latestLive = await getLatestLiveSession();
    if (latestLive?.id === waitingSessionId) return latestLive;

    if (row?.status === "scheduled" && row.scheduled_at) {
      const nowIso = await getServerNowIso();
      const nowMs = nowIso ? Date.parse(nowIso) : Date.now();
      if (Date.parse(row.scheduled_at) <= nowMs) {
        // Start time passed; cron may not have flipped status yet — play from scheduled_at.
        return {
          ...row,
          status: "live",
          live_started_at: row.live_started_at ?? row.scheduled_at,
        };
      }
    }

    await sleep(1000);
  }

  const last = await getCampfireSessionById(waitingSessionId);
  if (last?.status === "live") return last;
  if (last?.status === "scheduled" && last.scheduled_at) {
    const nowIso = await getServerNowIso();
    const nowMs = nowIso ? Date.parse(nowIso) : Date.now();
    if (Date.parse(last.scheduled_at) <= nowMs) {
      return {
        ...last,
        status: "live",
        live_started_at: last.live_started_at ?? last.scheduled_at,
      };
    }
  }

  return null;
}

/**
 * Scheduled session whose start time has passed but status may still be `scheduled`
 * until cron flips it to `live` (tile / wait UI grace period).
 */
export async function getStartingScheduledSession(
  nowMs?: number
): Promise<CampfireSessionRow | null> {
  const resolvedNowMs = await resolveServerNowMs(nowMs);
  const graceStartMs = resolvedNowMs - 3 * 60 * 60 * 1000;

  const { data, error } = await supabase
    .from("campfire_sessions")
    .select(SESSION_COLUMNS)
    .eq("status", "scheduled")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", new Date(resolvedNowMs).toISOString())
    .gte("scheduled_at", new Date(graceStartMs).toISOString())
    .order("scheduled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load starting scheduled campfire session:", error);
    return null;
  }
  return (data as CampfireSessionRow | null) ?? null;
}

/**
 * Returns the next scheduled session (scheduled_at in the future), or null.
 */
export async function getNextScheduledSession(
  nowMs?: number
): Promise<CampfireSessionRow | null> {
  const resolvedNowMs = await resolveServerNowMs(nowMs);
  const now = new Date(resolvedNowMs);
  const { data, error } = await supabase
    .from("campfire_sessions")
    .select(SESSION_COLUMNS)
    .eq("status", "scheduled")
    .not("scheduled_at", "is", null)
    .gte("scheduled_at", now.toISOString())
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load next scheduled campfire session:", error);
    return null;
  }
  return (data as CampfireSessionRow | null) ?? null;
}

/** Show countdown when next session is within this window (matches CampfireTile). */
export const CAMPFIRE_SOON_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type CampfireTileRefreshResult = {
  liveSession: CampfireSessionRow | null;
  scheduledAtMs: number | null;
  countdownMs: number;
  preloadSession: CampfireSessionRow | null;
};

/**
 * Single-pass campfire tile status: one live check, one server-time fetch, then
 * parallel scheduled-session lookups.
 */
export async function fetchCampfireTileRefresh(): Promise<CampfireTileRefreshResult> {
  const live = await getLatestLiveSession();
  if (live) {
    return {
      liveSession: live,
      scheduledAtMs: null,
      countdownMs: 0,
      preloadSession: live,
    };
  }

  const nowMs = await resolveServerNowMs();
  const [next, starting] = await Promise.all([
    getNextScheduledSession(nowMs),
    getStartingScheduledSession(nowMs),
  ]);

  if (next?.scheduled_at) {
    const at = Date.parse(next.scheduled_at);
    const delta = at - nowMs;
    if (delta > 0 && delta <= CAMPFIRE_SOON_WINDOW_MS) {
      return {
        liveSession: null,
        scheduledAtMs: at,
        countdownMs: delta,
        preloadSession: next,
      };
    }
  }

  if (starting?.scheduled_at) {
    const at = Date.parse(starting.scheduled_at);
    return {
      liveSession: null,
      scheduledAtMs: at,
      countdownMs: Math.max(0, at - nowMs),
      preloadSession: starting,
    };
  }

  return {
    liveSession: null,
    scheduledAtMs: null,
    countdownMs: 0,
    preloadSession: null,
  };
}

export async function getCampfireSessionById(
  sessionId: number
): Promise<CampfireSessionRow | null> {
  const { data, error } = await supabase
    .from("campfire_sessions")
    .select(SESSION_COLUMNS)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load campfire session:", error);
    return null;
  }
  return (data as CampfireSessionRow | null) ?? null;
}

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
    .select("photo_id, photo_url, activity_id, profile_id, activities ( title )")
    .eq("status", 1)
    .in("photo_id", ids);

  if (error) {
    console.error("Failed to load campfire submission photos:", error);
    return [];
  }

  const rows = data ?? [];
  const profileIds = [
    ...new Set(
      rows
        .map((row) => row.profile_id as number | undefined)
        .filter((id): id is number => id != null)
    ),
  ];

  const nicknamesByProfileId: Record<number, string> = {};
  if (profileIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profile_public")
      .select("id, nickname")
      .in("id", profileIds);

    if (profilesError) {
      console.error(
        "Failed to load submission nicknames for campfire:",
        profilesError
      );
    } else {
      for (const p of profilesData ?? []) {
        nicknamesByProfileId[p.id] = p.nickname ?? "";
      }
    }
  }

  return rows.map((row: Record<string, unknown>) => {
    const activities = row.activities as
      | { title: string | null }
      | { title: string | null }[]
      | null;
    const act = Array.isArray(activities) ? activities[0] : activities;
    const profileId = row.profile_id as number | undefined;
    const nickname =
      profileId != null
        ? nicknamesByProfileId[profileId]?.trim() || null
        : null;
    return {
      photo_id: row.photo_id as number,
      photo_url: row.photo_url as string,
      activity_id: (row.activity_id as number | null) ?? null,
      activity_title: act?.title ?? null,
      nickname,
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
