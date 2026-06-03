import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";

/** Client-side tap throttle (UI); server allows one counted reaction per UTC second. */
export const CAMPFIRE_REACTION_MIN_INTERVAL_MS = 500;

/** Cap remote reaction animations so high concurrency stays smooth. */
const INCOMING_REACTION_MAX_PER_WINDOW = 10;
const INCOMING_REACTION_WINDOW_MS = 500;

let incomingWindowStartMs = 0;
let incomingWindowCount = 0;

export type CampfireReactionPayload = {
  emoji: string;
  at: string;
  playhead_ms: number;
};

/**
 * Whether to render an incoming broadcast reaction (sample under load).
 */
export function shouldDisplayIncomingCampfireReaction(): boolean {
  const now = Date.now();
  if (now - incomingWindowStartMs >= INCOMING_REACTION_WINDOW_MS) {
    incomingWindowStartMs = now;
    incomingWindowCount = 0;
  }
  if (incomingWindowCount >= INCOMING_REACTION_MAX_PER_WINDOW) {
    return false;
  }
  incomingWindowCount += 1;
  return true;
}

export function resetIncomingCampfireReactionSampler(): void {
  incomingWindowStartMs = 0;
  incomingWindowCount = 0;
}

/**
 * Send a live reaction: broadcast first (ephemeral UI), then aggregate count async.
 * @see https://supabase.com/docs/guides/realtime/broadcast
 */
export async function sendCampfireReaction(
  channel: RealtimeChannel,
  sessionId: number,
  emoji: string,
  playheadMs: number
): Promise<boolean> {
  const payload: CampfireReactionPayload = {
    emoji,
    at: new Date().toISOString(),
    playhead_ms: Math.round(playheadMs),
  };

  const { error } = await channel.send({
    type: "broadcast",
    event: "reaction",
    payload,
  });

  if (error) {
    console.warn("Campfire reaction broadcast failed:", error.message);
    return false;
  }

  void supabase
    .rpc("record_campfire_reaction", {
      p_session_id: sessionId,
      p_emoji: emoji,
    })
    .then(({ error: rpcError }) => {
      if (rpcError) {
        console.warn("Campfire reaction aggregate failed:", rpcError.message);
      }
    });

  return true;
}

export async function getCampfireReactionTotal(
  sessionId: number
): Promise<number> {
  const { data, error } = await supabase.rpc("get_campfire_reaction_total", {
    p_session_id: sessionId,
  });

  if (error) {
    console.warn("Failed to load campfire reaction total:", error.message);
    return 0;
  }

  return typeof data === "number" ? data : Number(data) || 0;
}
