"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CampfireComponentRow, VideoComponentData } from "../types";

export function useCampfirePreviewVideo(
  components: CampfireComponentRow[],
  currentTimeMs: number,
  isPlaying: boolean
) {
  const videoEls = useRef<Map<number, HTMLVideoElement>>(new Map());
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const setVideoRef = useCallback(
    (componentId: number, el: HTMLVideoElement | null) => {
      if (el) {
        videoEls.current.set(componentId, el);
      } else {
        videoEls.current.delete(componentId);
      }
    },
    []
  );

  useEffect(() => {
    const activeVideos = components.filter(
      (c) =>
        c.type === "video" &&
        currentTimeMs >= c.start_time &&
        currentTimeMs < c.start_time + c.duration &&
        (c.data as VideoComponentData).videoUrl?.trim()
    );

    const activeIds = new Set(activeVideos.map((v) => v.id));

    for (const [id, el] of videoEls.current) {
      if (!activeIds.has(id)) {
        el.pause();
      }
    }

    for (const comp of activeVideos) {
      const el = videoEls.current.get(comp.id);
      if (!el) continue;

      const offsetSec = Math.max(
        0,
        (currentTimeMs - comp.start_time) / 1000
      );

      if (!isPlaying) {
        el.pause();
        if (Math.abs(el.currentTime - offsetSec) > 0.05) {
          el.currentTime = offsetSec;
        }
        continue;
      }

      if (el.paused) {
        el.currentTime = offsetSec;
        void el.play().catch(() => {});
        continue;
      }

      if (Math.abs(el.currentTime - offsetSec) > 0.25) {
        el.currentTime = offsetSec;
      }
    }
  }, [components, currentTimeMs, isPlaying]);

  useEffect(() => {
    const els = videoEls.current;
    return () => {
      for (const el of els.values()) {
        el.pause();
      }
    };
  }, []);

  return setVideoRef;
}
