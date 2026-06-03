import { prepareCampfireMedia } from "@/components/campfire/prepareCampfireMedia";
import {
  getCampfireSessionBundle,
  type CampfireSessionBundle,
  type CampfireSessionRow,
} from "@/services/campfireService";

export type CampfireLivePreload = {
  sessionId: number;
  bundle: CampfireSessionBundle;
  imagesReady: boolean;
};

/** Start background preload this long before a scheduled session goes live. */
export const CAMPFIRE_PRELOAD_LEAD_MS = 30_000;

let cached: CampfireLivePreload | null = null;
let inflight: Promise<CampfireLivePreload | null> | null = null;
let inflightSessionId: number | null = null;

export function invalidateCampfireLivePreload() {
  cached = null;
  inflight = null;
  inflightSessionId = null;
}

export function getCampfireLivePreload(
  sessionId: number
): CampfireLivePreload | null {
  if (!cached || cached.sessionId !== sessionId || !cached.imagesReady) {
    return null;
  }
  return cached;
}

/**
 * Fetch bundle + prefetch images for a session (scheduled or live).
 * Safe to call repeatedly; used while waiting on the campfire screen.
 */
export function startCampfireSessionPreload(sessionId: number): void {
  if (cached?.sessionId === sessionId && cached.imagesReady) return;
  if (inflight && inflightSessionId === sessionId) return;

  inflightSessionId = sessionId;

  inflight = (async () => {
    const bundle = await getCampfireSessionBundle(sessionId);
    if (!bundle) return null;
    await prepareCampfireMedia(bundle);
    const entry: CampfireLivePreload = {
      sessionId,
      bundle,
      imagesReady: true,
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
  sessionId: number
): Promise<CampfireLivePreload | null> {
  const hit = getCampfireLivePreload(sessionId);
  if (hit) return hit;
  if (inflight && inflightSessionId === sessionId) {
    const result = await inflight;
    if (result?.sessionId === sessionId) return result;
  }
  return null;
}
