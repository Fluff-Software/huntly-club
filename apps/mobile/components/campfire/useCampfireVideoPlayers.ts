import { useEffect, useRef, useState } from "react";
import type { VideoPlayer } from "expo-video";
import {
  peekCampfirePreload,
  rewarmCampfireVideoPreload,
  waitForCampfireLivePreload,
} from "@/services/campfireLivePreload";
import type { CampfireComponentRow } from "@/services/campfireService";
import {
  getCampfireVideoComponents,
  releaseCampfireVideoPlayers,
  warmCampfireVideoPlayers,
} from "./campfireVideoPreload";

export type CampfireVideoPlayers = {
  players: Map<number, VideoPlayer>;
  ready: boolean;
};

type Options = {
  playheadMs?: number;
  sessionId?: number | null;
  enabled?: boolean;
};

/**
 * Owns expo-video players for a session: adopts tile/wait-screen preload when
 * possible, seeks/buffers active clips for late live joins, and exposes the
 * same instances to the stage.
 */
export function useCampfireVideoPlayers(
  components: CampfireComponentRow[] | null,
  options: Options = {}
): CampfireVideoPlayers {
  const playheadMs = options.playheadMs ?? 0;
  const sessionId = options.sessionId ?? null;
  const enabled = options.enabled ?? true;

  const [players, setPlayers] = useState<Map<number, VideoPlayer>>(new Map());
  const [ready, setReady] = useState(false);
  const ownsPlayersRef = useRef(false);
  const playersRef = useRef(players);
  playersRef.current = players;

  useEffect(() => {
    if (!enabled || !components) {
      if (ownsPlayersRef.current) {
        releaseCampfireVideoPlayers(playersRef.current);
        ownsPlayersRef.current = false;
      }
      setPlayers(new Map());
      setReady(false);
      return;
    }

    const videoComps = getCampfireVideoComponents(components);
    if (videoComps.length === 0) {
      setPlayers(new Map());
      setReady(true);
      ownsPlayersRef.current = false;
      return;
    }

    let cancelled = false;

    const run = async () => {
      setReady(false);

      let existing: Map<number, VideoPlayer> | null = null;
      let fromCache = false;

      if (sessionId != null) {
        await waitForCampfireLivePreload(sessionId);
        if (cancelled) return;

        const peek = peekCampfirePreload(sessionId);
        if (peek?.videoPlayers.size) {
          existing = peek.videoPlayers;
          fromCache = true;
          if (peek.playheadMs !== playheadMs) {
            rewarmCampfireVideoPreload(sessionId, playheadMs);
            await waitForCampfireLivePreload(sessionId, playheadMs);
          }
        }
      }

      if (cancelled) return;

      const warmed = await warmCampfireVideoPlayers(
        components,
        playheadMs,
        existing
      );
      if (cancelled) return;

      ownsPlayersRef.current = !fromCache;
      setPlayers(warmed.players);
      setReady(warmed.ready);
    };

    void run();

    return () => {
      cancelled = true;
      if (ownsPlayersRef.current) {
        const toRelease = playersRef.current;
        ownsPlayersRef.current = false;
        queueMicrotask(() => {
          releaseCampfireVideoPlayers(toRelease);
        });
      }
    };
  }, [components, enabled, playheadMs, sessionId]);

  return { players, ready };
}
