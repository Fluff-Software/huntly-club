import { createVideoPlayer, type VideoPlayer } from "expo-video";
import type {
  CampfireComponentRow,
  VideoComponentData,
} from "@/services/campfireService";
import {
  isVideoPlayerAlive,
  safePlayerCurrentTime,
  safePlayerPause,
  safePlayerPlay,
  safePlayerSeek,
} from "./campfireVideoPlayerUtils";

const BUFFER_LEAD_SEC = 1;
const SEEK_TOLERANCE_SEC = 0.75;
const INITIAL_READY_TIMEOUT_MS = 20_000;
const BUFFER_AT_OFFSET_TIMEOUT_MS = 14_000;

export function getCampfireVideoComponents(
  components: CampfireComponentRow[]
): CampfireComponentRow[] {
  return components.filter(
    (c) =>
      c.type === "video" &&
      (c.data as VideoComponentData).videoUrl?.trim()
  );
}

export function isCampfireVideoActiveAt(
  comp: CampfireComponentRow,
  timeMs: number
): boolean {
  return (
    timeMs >= comp.start_time && timeMs < comp.start_time + comp.duration
  );
}

export function campfireVideoOffsetSec(
  comp: CampfireComponentRow,
  timeMs: number
): number {
  return Math.max(0, (timeMs - comp.start_time) / 1000);
}

export function configureCampfireVideoPlayer(player: VideoPlayer): void {
  try {
    // Muted during preload; CampfireVideo unmutes when the clip is shown.
    player.muted = true;
    player.volume = 1;
    player.audioMixingMode = "mixWithOthers";
    player.timeUpdateEventInterval = 0.25;
    player.seekTolerance = {
      toleranceBefore: SEEK_TOLERANCE_SEC,
      toleranceAfter: SEEK_TOLERANCE_SEC,
    };
    player.bufferOptions = {
      preferredForwardBufferDuration: 30,
      minBufferForPlayback: 2,
    };
    player.pause();
  } catch {
    // ignore
  }
}

export function releaseCampfireVideoPlayers(
  players: Map<number, VideoPlayer> | null | undefined
): void {
  if (!players) return;
  for (const player of players.values()) {
    try {
      player.release();
    } catch {
      // ignore
    }
  }
}

function waitForPlayerReady(
  player: VideoPlayer,
  timeoutMs: number
): Promise<void> {
  if (player.status === "readyToPlay" || player.status === "error") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      sub.remove();
      clearTimeout(timer);
      resolve();
    };
    const sub = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay" || status === "error") done();
    });
    const timer = setTimeout(done, timeoutMs);
  });
}

function isBufferedAt(player: VideoPlayer, targetSec: number): boolean {
  if (!isVideoPlayerAlive(player)) return false;
  try {
    const buffered = player.bufferedPosition;
    if (buffered >= 0) {
      return buffered >= targetSec - BUFFER_LEAD_SEC;
    }
    const current = safePlayerCurrentTime(player);
    if (current == null) return false;
    return Math.abs(current - targetSec) <= SEEK_TOLERANCE_SEC + 0.5;
  } catch {
    return false;
  }
}

/**
 * Seek to `targetSec` and wait until the player has buffered far enough to play
 * from that point (expo-video `bufferedPosition`).
 */
export async function waitForVideoBufferedAt(
  player: VideoPlayer,
  targetSec: number,
  timeoutMs = BUFFER_AT_OFFSET_TIMEOUT_MS
): Promise<boolean> {
  if (!isVideoPlayerAlive(player)) return false;

  if (targetSec <= 0.5) {
    safePlayerSeek(player, 0);
    safePlayerPause(player);
    return true;
  }

  safePlayerSeek(player, targetSec);
  // Brief play encourages the native player to fetch media ahead of the seek.
  safePlayerPlay(player);

  const started = Date.now();
  return new Promise((resolve) => {
    let settled = false;
    let sub: { remove: () => void } | null = null;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      sub?.remove();
      clearInterval(poll);
      clearTimeout(hardTimeout);
      safePlayerPause(player);
      resolve(ok);
    };

    const check = () => {
      if (!isVideoPlayerAlive(player)) {
        finish(false);
        return;
      }
      if (isBufferedAt(player, targetSec)) {
        finish(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        finish(false);
      }
    };

    try {
      sub = player.addListener("statusChange", check);
    } catch {
      finish(false);
      return;
    }
    const poll = setInterval(check, 120);
    const hardTimeout = setTimeout(() => finish(false), timeoutMs + 50);
    check();
  });
}

export type WarmCampfireVideoPlayersResult = {
  players: Map<number, VideoPlayer>;
  ready: boolean;
};

/**
 * Create or reuse video players and buffer them for `playheadMs`.
 * Per expo-video docs, players buffer even without a mounted VideoView.
 */
export async function warmCampfireVideoPlayers(
  components: CampfireComponentRow[],
  playheadMs: number,
  existing?: Map<number, VideoPlayer> | null
): Promise<WarmCampfireVideoPlayersResult> {
  const videoComps = getCampfireVideoComponents(components);
  if (videoComps.length === 0) {
    return { players: new Map(), ready: true };
  }

  const map = existing ?? new Map<number, VideoPlayer>();

  if (!existing) {
    for (const comp of videoComps) {
      const url = (comp.data as VideoComponentData).videoUrl!.trim();
      const player = createVideoPlayer({ uri: url, useCaching: true });
      configureCampfireVideoPlayer(player);
      map.set(comp.id, player);
    }

    await Promise.allSettled(
      Array.from(map.values()).map((player) =>
        waitForPlayerReady(player, INITIAL_READY_TIMEOUT_MS)
      )
    );
  } else {
    for (const player of map.values()) {
      configureCampfireVideoPlayer(player);
    }
  }

  const activeAtPlayhead = videoComps.filter((c) =>
    isCampfireVideoActiveAt(c, playheadMs)
  );

  if (activeAtPlayhead.length === 0) {
    return { players: map, ready: true };
  }

  const bufferResults = await Promise.all(
    activeAtPlayhead.map(async (comp) => {
      const player = map.get(comp.id);
      if (!player) return false;
      const offsetSec = campfireVideoOffsetSec(comp, playheadMs);
      return waitForVideoBufferedAt(player, offsetSec);
    })
  );

  return {
    players: map,
    ready: bufferResults.every(Boolean),
  };
}
