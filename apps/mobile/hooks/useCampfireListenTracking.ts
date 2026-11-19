import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  recordCampfireListenProgress,
  startCampfireListen,
  type CampfireListenProgress,
} from "@/services/campfireListenService";

const FLUSH_INTERVAL_MS = 15_000;
/** Cap per status tick so a stalled JS thread can't inflate listen time. */
const MAX_PLAYBACK_TICK_MS = 2_000;

export type CampfirePlaybackSample = {
  playing: boolean;
  positionMs: number;
  durationMs: number;
};

export type CampfireListenTracker = {
  /** User tapped play (first play or resume). */
  onPlayPressed: () => void;
  /** Feed every player status update. */
  onPlayback: (sample: CampfirePlaybackSample) => void;
  /** Recording reached the end. */
  onCompleted: () => void;
};

type Options = {
  sessionId: number | null;
  /** Session status when the screen opened (scheduled / live / replay). */
  openedStatus: string | null;
  enabled: boolean;
};

/**
 * Records one `campfire_listens` row per visit to the campfire screen: when it
 * was opened, time spent on screen (foreground only), play presses, audio
 * actually played, furthest position and completion. Best-effort — failures
 * are logged and never affect playback.
 */
export function useCampfireListenTracking({
  sessionId,
  openedStatus,
  enabled,
}: Options): CampfireListenTracker {
  const listenIdRef = useRef<Promise<string | null> | null>(null);
  const progressRef = useRef<CampfireListenProgress>(emptyProgress());
  const visibleSinceRef = useRef<number | null>(null);
  const lastPlaybackRef = useRef<{ atMs: number; playing: boolean } | null>(
    null
  );
  const openedStatusRef = useRef(openedStatus);
  openedStatusRef.current = openedStatus;

  const activeSessionId = enabled ? sessionId : null;

  const settleViewTime = useCallback(() => {
    if (visibleSinceRef.current == null) return;
    const now = Date.now();
    progressRef.current.viewMs += now - visibleSinceRef.current;
    visibleSinceRef.current = now;
  }, []);

  const flush = useCallback(() => {
    const pending = listenIdRef.current;
    if (!pending) return;
    settleViewTime();
    const snapshot = { ...progressRef.current };
    void pending.then((id) => {
      if (id) void recordCampfireListenProgress(id, snapshot);
    });
  }, [settleViewTime]);

  // Open / close a listen row as the screen's session comes and goes.
  useEffect(() => {
    if (activeSessionId == null) return;

    progressRef.current = emptyProgress();
    lastPlaybackRef.current = null;
    visibleSinceRef.current =
      AppState.currentState === "active" ? Date.now() : null;
    listenIdRef.current = startCampfireListen(
      activeSessionId,
      openedStatusRef.current
    );

    const interval = setInterval(flush, FLUSH_INTERVAL_MS);

    const onAppState = (state: AppStateStatus) => {
      if (state === "active") {
        if (visibleSinceRef.current == null) {
          visibleSinceRef.current = Date.now();
        }
        lastPlaybackRef.current = null;
        return;
      }
      flush();
      visibleSinceRef.current = null;
      lastPlaybackRef.current = null;
    };
    const sub = AppState.addEventListener("change", onAppState);

    return () => {
      clearInterval(interval);
      sub.remove();
      flush();
      listenIdRef.current = null;
      visibleSinceRef.current = null;
      lastPlaybackRef.current = null;
    };
  }, [activeSessionId, flush]);

  const onPlayPressed = useCallback(() => {
    if (!listenIdRef.current) return;
    progressRef.current.playCount += 1;
    flush();
  }, [flush]);

  const onPlayback = useCallback(
    ({ playing, positionMs, durationMs }: CampfirePlaybackSample) => {
      if (!listenIdRef.current) return;
      const now = Date.now();
      const p = progressRef.current;
      const last = lastPlaybackRef.current;
      if (last?.playing && playing) {
        p.listenedMs += Math.min(MAX_PLAYBACK_TICK_MS, now - last.atMs);
      }
      if (positionMs > p.maxPositionMs) p.maxPositionMs = positionMs;
      if (durationMs > 0) p.audioDurationMs = durationMs;
      const pausedNow = last?.playing && !playing;
      lastPlaybackRef.current = { atMs: now, playing };
      if (pausedNow) flush();
    },
    [flush]
  );

  const onCompleted = useCallback(() => {
    if (!listenIdRef.current) return;
    progressRef.current.completed = true;
    flush();
  }, [flush]);

  return useMemo(
    () => ({ onPlayPressed, onPlayback, onCompleted }),
    [onPlayPressed, onPlayback, onCompleted]
  );
}

function emptyProgress(): CampfireListenProgress {
  return {
    viewMs: 0,
    playCount: 0,
    listenedMs: 0,
    maxPositionMs: 0,
    audioDurationMs: null,
    completed: false,
  };
}
