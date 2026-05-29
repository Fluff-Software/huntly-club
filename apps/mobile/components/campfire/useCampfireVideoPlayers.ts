import { useEffect, useRef, useState } from "react";
import { createVideoPlayer, type VideoPlayer } from "expo-video";
import type {
  CampfireComponentRow,
  VideoComponentData,
} from "@/services/campfireService";

export type CampfireVideoPlayers = {
  players: Map<number, VideoPlayer>;
  ready: boolean;
};

/**
 * Creates one persistent video player per video component up front and reports
 * when they have all buffered enough to render their first frame
 * (`readyToPlay`). The same player instances are handed to the stage so the
 * video is already decoded/buffered by the time it appears on screen.
 */
export function useCampfireVideoPlayers(
  components: CampfireComponentRow[] | null
): CampfireVideoPlayers {
  const [players, setPlayers] = useState<Map<number, VideoPlayer>>(new Map());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!components) {
      setPlayers(new Map());
      setReady(false);
      return;
    }

    const videoComps = components.filter(
      (c) =>
        c.type === "video" &&
        (c.data as VideoComponentData).videoUrl?.trim()
    );

    if (videoComps.length === 0) {
      setPlayers(new Map());
      setReady(true);
      return;
    }

    const map = new Map<number, VideoPlayer>();
    const subscriptions: { remove: () => void }[] = [];
    let cancelled = false;

    const readyPromises = videoComps.map((c) => {
      const url = (c.data as VideoComponentData).videoUrl!.trim();
      const player = createVideoPlayer({ uri: url });
      try {
        // Narration comes from audio components; keep video silent so it
        // does not take the device audio session from expo-audio.
        player.muted = true;
        player.timeUpdateEventInterval = 0.25;
        player.pause();
      } catch {
        // ignore
      }
      map.set(c.id, player);

      return new Promise<void>((resolve) => {
        if (player.status === "readyToPlay" || player.status === "error") {
          resolve();
          return;
        }
        const sub = player.addListener("statusChange", ({ status }) => {
          if (status === "readyToPlay" || status === "error") resolve();
        });
        subscriptions.push(sub);
      });
    });

    setPlayers(map);
    setReady(false);

    void Promise.allSettled(readyPromises).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      subscriptions.forEach((s) => {
        try {
          s.remove();
        } catch {
          // ignore
        }
      });
      for (const player of map.values()) {
        try {
          player.release();
        } catch {
          // ignore
        }
      }
    };
  }, [components]);

  return { players, ready };
}
