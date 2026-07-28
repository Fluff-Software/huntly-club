/**
 * Short foil-rip one-shot for Explore pack open.
 */
import { useCallback, useEffect, useRef } from "react";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";

const RIP_SOUND = require("@/assets/sounds/pack-rip.wav");

export function usePackRipSound() {
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: "mixWithOthers",
        });
        if (cancelled) return;
        const player = createAudioPlayer(RIP_SOUND);
        player.volume = 0.85;
        playerRef.current = player;
      } catch {
        playerRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
      const p = playerRef.current;
      playerRef.current = null;
      if (!p) return;
      try {
        p.pause();
        p.remove();
      } catch {
        // ignore
      }
    };
  }, []);

  const playRip = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      void p.seekTo(0).then(() => {
        try {
          p.play();
        } catch {
          // ignore
        }
      });
    } catch {
      try {
        p.play();
      } catch {
        // ignore
      }
    }
  }, []);

  const stopRip = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      p.pause();
      void p.seekTo(0);
    } catch {
      // ignore
    }
  }, []);

  return { playRip, stopRip };
}
