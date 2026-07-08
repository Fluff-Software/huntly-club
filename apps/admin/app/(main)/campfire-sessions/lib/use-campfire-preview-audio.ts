"use client";

import { useEffect, useRef } from "react";
import { getAudioComponentData } from "./audio-component";
import type { CampfireComponentRow } from "../types";

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
  const url = getAudioComponentData(component).audioUrl?.trim();
  if (!url) return null;
  return { component, url };
}

function sameSrc(el: HTMLAudioElement, url: string): boolean {
  try {
    return el.src === url || el.src === new URL(url, window.location.href).href;
  } catch {
    return el.src === url;
  }
}

export function useCampfirePreviewAudio(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  components: CampfireComponentRow[],
  currentTimeMs: number,
  isPlaying: boolean
) {
  const activeAudioIdRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const active = findActiveAudioAt(components, currentTimeMs);

    if (!active) {
      activeAudioIdRef.current = null;
      el.pause();
      return;
    }

    const { component, url } = active;
    const offsetSec = Math.max(0, (currentTimeMs - component.start_time) / 1000);
    const clipChanged = activeAudioIdRef.current !== component.id;
    const srcChanged = !sameSrc(el, url);

    const applyOffset = () => {
      if (Number.isFinite(offsetSec)) {
        el.currentTime = offsetSec;
      }
    };

    const playIfNeeded = () => {
      if (!isPlayingRef.current) {
        el.pause();
        applyOffset();
        return;
      }
      void el.play().catch(() => {});
    };

    if (clipChanged || srcChanged) {
      activeAudioIdRef.current = component.id;
      const onReady = () => {
        applyOffset();
        playIfNeeded();
        el.removeEventListener("loadeddata", onReady);
        el.removeEventListener("canplay", onReady);
      };
      el.addEventListener("loadeddata", onReady);
      el.addEventListener("canplay", onReady);
      el.src = url;
      applyOffset();
      playIfNeeded();
      return () => {
        el.removeEventListener("loadeddata", onReady);
        el.removeEventListener("canplay", onReady);
      };
    }

    if (!isPlaying) {
      el.pause();
      if (Math.abs(el.currentTime - offsetSec) > 0.05) {
        applyOffset();
      }
      return;
    }

    if (el.paused) {
      applyOffset();
      playIfNeeded();
      return;
    }

    if (Math.abs(el.currentTime - offsetSec) > 0.25) {
      applyOffset();
    }
  }, [audioRef, components, currentTimeMs, isPlaying]);

  useEffect(() => {
    const el = audioRef.current;
    return () => {
      if (el) {
        el.pause();
        el.removeAttribute("src");
      }
    };
  }, [audioRef]);
}
