import { useEffect, useRef } from "react";
import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
} from "expo-audio";
import type {
  AudioComponentData,
  CampfireComponentRow,
} from "@/services/campfireService";

function findActiveAudioAt(
  components: CampfireComponentRow[],
  timeMs: number
): { component: CampfireComponentRow; url: string } | null {
  const active = components.filter(
    (c) =>
      c.type === "audio" &&
      timeMs >= c.start_time &&
      timeMs < c.start_time + c.duration
  );
  if (active.length === 0) return null;

  const component = active.reduce((best, c) =>
    c.start_time >= best.start_time ? c : best
  );
  const url = (component.data as AudioComponentData).audioUrl?.trim();
  if (!url) return null;
  return { component, url };
}

function offsetSecFor(
  component: CampfireComponentRow,
  timeMs: number
): number {
  return Math.max(0, (timeMs - component.start_time) / 1000);
}

function waitUntilLoaded(
  player: AudioPlayer,
  onReady: () => void
): () => void {
  if (player.isLoaded) {
    onReady();
    return () => {};
  }

  let cancelled = false;
  let raf = 0;
  const startedAt = Date.now();

  const tick = () => {
    if (cancelled) return;
    if (player.isLoaded || Date.now() - startedAt > 15_000) {
      onReady();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  tick();

  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}

function syncPlayback(
  player: AudioPlayer,
  component: CampfireComponentRow,
  timeMs: number,
  shouldPlay: boolean
) {
  const offsetSec = offsetSecFor(component, timeMs);
  void player.seekTo(offsetSec).finally(() => {
    try {
      player.volume = 1;
      if (shouldPlay) {
        if (!player.playing) player.play();
      } else {
        player.pause();
      }
    } catch {
      // ignore
    }
  });
}

/**
 * Drives a single audio player synced to the campfire timeline.
 * A new player is created per clip (with `downloadFirst`) so loading is
 * reliable; effects are keyed by clip id — not `currentTimeMs` — so work
 * is not cancelled every animation frame.
 */
export function useCampfireAudio(
  components: CampfireComponentRow[],
  currentTimeMs: number,
  isPlaying: boolean,
  enabled: boolean
) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const componentRef = useRef<CampfireComponentRow | null>(null);
  const timeMsRef = useRef(currentTimeMs);
  const isPlayingRef = useRef(isPlaying);
  timeMsRef.current = currentTimeMs;
  isPlayingRef.current = isPlaying;

  const active = enabled
    ? findActiveAudioAt(components, currentTimeMs)
    : null;
  const clipId = active?.component.id ?? null;
  const clipUrl = active?.url ?? null;

  if (active) {
    componentRef.current = active.component;
  }

  // Tear down immediately when playback is disabled (e.g. user left the screen).
  useEffect(() => {
    if (enabled) return;
    const player = playerRef.current;
    if (player) {
      try {
        player.pause();
        player.remove();
      } catch {
        // ignore
      }
      playerRef.current = null;
    }
    void setIsAudioActiveAsync(false).catch(() => {
      /* ignore */
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void (async () => {
      try {
        await setIsAudioActiveAsync(true);
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          shouldPlayInBackground: false,
          interruptionMode: "mixWithOthers",
        });
      } catch {
        // ignore
      }
    })();
  }, [enabled]);

  // Create / destroy player when the active clip changes.
  useEffect(() => {
    const previous = playerRef.current;
    if (previous) {
      try {
        previous.remove();
      } catch {
        // ignore
      }
      playerRef.current = null;
    }

    if (!enabled || !clipId || !clipUrl) return;

    const component = componentRef.current;
    if (!component) return;

    const player = createAudioPlayer(clipUrl, {
      downloadFirst: true,
      updateInterval: 250,
    });
    playerRef.current = player;
    try {
      player.volume = 1;
      player.muted = false;
    } catch {
      // ignore
    }

    let cancelled = false;
    const cancelWait = waitUntilLoaded(player, () => {
      if (cancelled) return;
      syncPlayback(
        player,
        component,
        timeMsRef.current,
        isPlayingRef.current
      );
    });

    return () => {
      cancelled = true;
      cancelWait();
      try {
        player.remove();
      } catch {
        // ignore
      }
      if (playerRef.current === player) {
        playerRef.current = null;
      }
    };
  }, [enabled, clipId, clipUrl]);

  // Play / pause when transport state changes (same clip).
  useEffect(() => {
    const player = playerRef.current;
    const component = componentRef.current;
    if (!player || !enabled || !clipId || !component) return;

    if (!isPlaying) {
      try {
        player.pause();
        const offsetSec = offsetSecFor(component, timeMsRef.current);
        if (Math.abs(player.currentTime - offsetSec) > 0.1) {
          void player.seekTo(offsetSec);
        }
      } catch {
        // ignore
      }
      return;
    }

    if (!player.playing) {
      syncPlayback(player, component, timeMsRef.current, true);
    }
  }, [enabled, isPlaying, clipId]);

  // Resync position while playing (reads time from ref — no effect churn).
  useEffect(() => {
    const player = playerRef.current;
    const component = componentRef.current;
    if (!player || !enabled || !isPlaying || !clipId || !component) return;

    const interval = setInterval(() => {
      const p = playerRef.current;
      const c = componentRef.current;
      if (!p || !c) return;
      try {
        if (!p.playing) {
          syncPlayback(p, c, timeMsRef.current, true);
          return;
        }
        const offsetSec = offsetSecFor(c, timeMsRef.current);
        if (Math.abs(p.currentTime - offsetSec) > 0.35) {
          void p.seekTo(offsetSec);
        }
      } catch {
        // ignore
      }
    }, 250);

    return () => clearInterval(interval);
  }, [enabled, isPlaying, clipId]);
}
