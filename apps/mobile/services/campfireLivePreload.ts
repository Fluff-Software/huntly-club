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

/** Fetch bundle + prefetch images for a live session (safe to call repeatedly). */
export function startCampfireLivePreload(
  session: CampfireSessionRow
): void {
  if (session.status !== "live") return;
  if (cached?.sessionId === session.id && cached.imagesReady) return;
  if (inflight && inflightSessionId === session.id) return;

  const sessionId = session.id;
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
      console.error("Campfire live preload failed:", err);
      return null;
    })
    .finally(() => {
      inflight = null;
      inflightSessionId = null;
    });
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
