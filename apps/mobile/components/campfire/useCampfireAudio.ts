import { useEffect, useRef } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
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

  // If multiple overlap, prefer the one that started most recently.
  const component = active.reduce((best, c) =>
    c.start_time >= best.start_time ? c : best
  );
  const url = (component.data as AudioComponentData).audioUrl?.trim();
  if (!url) return null;
  return { component, url };
}

/**
 * Drives a single audio player so narration stays in sync with the campfire
 * timeline clock. Mirrors the admin preview's audio behaviour:
 * - swaps the source when the active audio clip changes
 * - seeks to the correct offset within the clip
 * - plays/pauses with the timeline
 */
export function useCampfireAudio(
  components: CampfireComponentRow[],
  currentTimeMs: number,
  isPlaying: boolean
) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const activeAudioIdRef = useRef<number | null>(null);
  const activeUrlRef = useRef<string | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Create the player once and configure audio to play even in silent mode.
  useEffect(() => {
    const player = createAudioPlayer(null);
    playerRef.current = player;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    return () => {
      try {
        player.remove();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const active = findActiveAudioAt(components, currentTimeMs);

    if (!active) {
      activeAudioIdRef.current = null;
      activeUrlRef.current = null;
      try {
        player.pause();
      } catch {
        // ignore
      }
      return;
    }

    const { component, url } = active;
    const offsetSec = Math.max(0, (currentTimeMs - component.start_time) / 1000);
    const clipChanged = activeAudioIdRef.current !== component.id;
    const srcChanged = activeUrlRef.current !== url;

    if (clipChanged || srcChanged) {
      activeAudioIdRef.current = component.id;
      activeUrlRef.current = url;
      try {
        player.replace({ uri: url });
        void player.seekTo(offsetSec);
        if (isPlayingRef.current) player.play();
        else player.pause();
      } catch {
        // ignore
      }
      return;
    }

    if (!isPlaying) {
      try {
        player.pause();
        if (Math.abs(player.currentTime - offsetSec) > 0.1) {
          void player.seekTo(offsetSec);
        }
      } catch {
        // ignore
      }
      return;
    }

    try {
      if (!player.playing) {
        void player.seekTo(offsetSec);
        player.play();
        return;
      }
      // Resync if the clock and audio have drifted apart.
      if (Math.abs(player.currentTime - offsetSec) > 0.3) {
        void player.seekTo(offsetSec);
      }
    } catch {
      // ignore
    }
  }, [components, currentTimeMs, isPlaying]);
}
