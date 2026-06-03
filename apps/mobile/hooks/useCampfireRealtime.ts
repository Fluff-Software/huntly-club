import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";

type PresenceState = Record<string, unknown[]>;

/**
 * Count viewers as the sum of each household's profiles (one presence key per auth user).
 * Uses only the latest meta per key — re-tracks and duplicate metas must not inflate the total.
 */
export function countCampfireViewers(state: PresenceState): number {
  let total = 0;

  for (const metas of Object.values(state)) {
    if (!Array.isArray(metas) || metas.length === 0) {
      total += 1;
      continue;
    }

    const meta = metas[metas.length - 1];
    if (!meta || typeof meta !== "object") {
      total += 1;
      continue;
    }

    const ids = (meta as { profile_ids?: unknown }).profile_ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      total += 1;
      continue;
    }

    const unique = new Set(
      ids.filter((id): id is number => typeof id === "number")
    );
    total += unique.size > 0 ? unique.size : 1;
  }

  return total;
}

type UseCampfireRealtimeOptions = {
  sessionId: number | null;
  userId: string | null | undefined;
  profileIds: number[];
  onReaction: (emoji: string) => void;
};

/**
 * Private Realtime channel for campfire presence + reaction broadcasts.
 * @see https://supabase.com/docs/guides/realtime/presence
 * @see https://supabase.com/docs/guides/realtime/authorization
 */
export function useCampfireRealtime({
  sessionId,
  userId,
  profileIds,
  onReaction,
}: UseCampfireRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const onReactionRef = useRef(onReaction);
  onReactionRef.current = onReaction;

  // Private channels evaluate RLS with the Realtime JWT — keep it synced with auth.
  useEffect(() => {
    const applyToken = async (accessToken: string | undefined) => {
      if (accessToken) {
        await supabase.realtime.setAuth(accessToken);
      }
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void applyToken(session?.access_token);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyToken(session?.access_token);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (sessionId == null || !userId) {
      setViewerCount(0);
      return;
    }

    let cancelled = false;
    let subscribed = false;

    const channel = supabase.channel(`campfire:${sessionId}`, {
      config: {
        private: true,
        broadcast: { self: true },
        presence: { key: userId },
      },
    });

    channel.on("broadcast", { event: "reaction" }, ({ payload }) => {
      const emoji = typeof payload?.emoji === "string" ? payload.emoji : "🔥";
      onReactionRef.current(emoji);
    });

    const updateViewerCount = () => {
      if (cancelled) return;
      setViewerCount(
        countCampfireViewers(channel.presenceState() as PresenceState)
      );
    };

    channel
      .on("presence", { event: "sync" }, updateViewerCount)
      .on("presence", { event: "join" }, updateViewerCount)
      .on("presence", { event: "leave" }, updateViewerCount);

    channel.subscribe(async (status, err) => {
      if (cancelled) return;
      if (status === "SUBSCRIBED") {
        subscribed = true;
        try {
          if (profileIds.length > 0) {
            await channel.track({
              profile_ids: profileIds,
              online_at: new Date().toISOString(),
            });
          }
          updateViewerCount();
        } catch (e) {
          console.warn("Campfire presence track failed:", e);
        }
      } else if (status === "CHANNEL_ERROR") {
        console.warn(
          "Campfire realtime subscribe failed:",
          err?.message ?? err ?? status
        );
      }
    });

    channelRef.current = channel;

    return () => {
      cancelled = true;
      channelRef.current = null;
      void (async () => {
        if (subscribed) {
          try {
            await channel.untrack();
          } catch {
            /* best-effort */
          }
        }
        supabase.removeChannel(channel);
      })();
      setViewerCount(0);
    };
  }, [sessionId, userId]);

  // Re-track when profiles load; update count after payload sync (latest meta per key).
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || sessionId == null || !userId || profileIds.length === 0) return;

    void channel
      .track({
        profile_ids: profileIds,
        online_at: new Date().toISOString(),
      })
      .then(() => {
        setViewerCount(
          countCampfireViewers(channel.presenceState() as PresenceState)
        );
      })
      .catch(() => {
        /* best-effort */
      });
  }, [sessionId, userId, profileIds]);

  return { viewerCount, channelRef };
}
