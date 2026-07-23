import { prepareCampfireMedia } from "@/components/campfire/prepareCampfireMedia";
import {
  releaseCampfireVideoPlayers,
  warmCampfireVideoPlayers,
} from "@/components/campfire/campfireVideoPreload";
import type { VideoPlayer } from "expo-video";
import {
  getCampfireSessionBundle,
  type CampfireSessionBundle,
  type CampfireSessionRow,
} from "@/services/campfireService";

export type CampfireLivePreload = {
  sessionId: number;
  bundle: CampfireSessionBundle;
  imagesReady: boolean;
  videosReady: boolean;
  videoPlayers: Map<number, VideoPlayer>;
  /** Playhead (ms) the video players were warmed for. */
  playheadMs: number;
};

/** Start background preload this long before a scheduled session goes live. */
export const CAMPFIRE_PRELOAD_LEAD_MS = 30_000;

let cached: CampfireLivePreload | null = null;
let inflight: Promise<CampfireLivePreload | null> | null = null;
let inflightSessionId: number | null = null;

/**
 * Clears preload cache. Releases native video players on the next microtask so
 * mounted VideoViews can unmount first (avoids "shared object released" errors).
 */
export function invalidateCampfireLivePreload() {
  const players = cached?.videoPlayers;
  cached = null;
  inflight = null;
  inflightSessionId = null;
  if (players?.size) {
    queueMicrotask(() => {
      releaseCampfireVideoPlayers(players);
    });
  }
}

/** Latest cache entry for a session (even if video rewarm is in progress). */
export function peekCampfirePreload(
  sessionId: number
): CampfireLivePreload | null {
  if (!cached || cached.sessionId !== sessionId) return null;
  return cached;
}

export function getCampfireLivePreload(
  sessionId: number,
  playheadMs?: number
): CampfireLivePreload | null {
  if (!cached || cached.sessionId !== sessionId || !cached.imagesReady) {
    return null;
  }
  if (playheadMs != null && cached.playheadMs !== playheadMs) {
    return null;
  }
  if (!cached.videosReady) {
    return null;
  }
  return cached;
}

/**
 * Fetch bundle + prefetch images and warm video players for a session.
 * Safe to call repeatedly; used while waiting on the campfire screen.
 */
export function startCampfireSessionPreload(
  sessionId: number,
  playheadMs = 0
): void {
  if (
    cached?.sessionId === sessionId &&
    cached.imagesReady &&
    cached.videosReady &&
    cached.playheadMs === playheadMs
  ) {
    return;
  }
  if (inflight && inflightSessionId === sessionId) return;

  inflightSessionId = sessionId;

  inflight = (async () => {
    const bundle = await getCampfireSessionBundle(sessionId);
    if (!bundle) return null;

    await prepareCampfireMedia(bundle);

    const existingPlayers =
      cached?.sessionId === sessionId ? cached.videoPlayers : null;
    const { players, ready } = await warmCampfireVideoPlayers(
      bundle.components,
      playheadMs,
      existingPlayers
    );

    if (cached?.sessionId === sessionId && cached.videoPlayers !== players) {
      releaseCampfireVideoPlayers(cached.videoPlayers);
    }

    const entry: CampfireLivePreload = {
      sessionId,
      bundle,
      imagesReady: true,
      videosReady: ready,
      videoPlayers: players,
      playheadMs,
    };
    cached = entry;
    return entry;
  })()
    .catch((err) => {
      console.error("Campfire session preload failed:", err);
      return null;
    })
    .finally(() => {
      inflight = null;
      inflightSessionId = null;
    });
}

/** @deprecated Use startCampfireSessionPreload — kept for tile live detection. */
export function startCampfireLivePreload(session: CampfireSessionRow): void {
  startCampfireSessionPreload(session.id);
}

export async function waitForCampfireLivePreload(
  sessionId: number,
  playheadMs?: number
): Promise<CampfireLivePreload | null> {
  if (inflight && inflightSessionId === sessionId) {
    const result = await inflight;
    if (result?.sessionId !== sessionId) return null;
    if (playheadMs == null) return result;
    if (result.playheadMs !== playheadMs) {
      return result.imagesReady ? result : null;
    }
    return result.videosReady ? result : null;
  }
  if (playheadMs == null) {
    return peekCampfirePreload(sessionId);
  }
  return getCampfireLivePreload(sessionId, playheadMs);
}

/**
 * Re-warm cached video players for a late live join (playhead > 0).
 */
export function rewarmCampfireVideoPreload(
  sessionId: number,
  playheadMs: number
): void {
  if (!cached || cached.sessionId !== sessionId) {
    startCampfireSessionPreload(sessionId, playheadMs);
    return;
  }
  if (cached.playheadMs === playheadMs && cached.videosReady) return;

  cached = { ...cached, videosReady: false, playheadMs };

  inflightSessionId = sessionId;
  inflight = (async () => {
    const { players, ready } = await warmCampfireVideoPlayers(
      cached!.bundle.components,
      playheadMs,
      cached!.videoPlayers
    );
    cached = {
      ...cached!,
      videoPlayers: players,
      videosReady: ready,
      playheadMs,
    };
    return cached;
  })()
    .catch((err) => {
      console.error("Campfire video rewarm failed:", err);
      return null;
    })
    .finally(() => {
      inflight = null;
      inflightSessionId = null;
    });
}
