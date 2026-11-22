import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "./supabase";

export type CampfireListenProgress = {
  viewMs: number;
  playCount: number;
  listenedMs: number;
  maxPositionMs: number;
  audioDurationMs: number | null;
  completed: boolean;
};

/**
 * Records that the signed-in user opened the campfire screen for a session.
 * Returns the listen row id, or null if it couldn't be recorded (tracking is
 * best-effort and must never block playback).
 */
export async function startCampfireListen(
  sessionId: number,
  openedStatus: string | null
): Promise<string | null> {
  const { data, error } = await supabase.rpc("start_campfire_listen", {
    p_session_id: sessionId,
    p_opened_status: openedStatus,
    p_platform: Platform.OS,
    p_app_version: Constants.expoConfig?.version ?? null,
  });
  if (error) {
    console.warn("Failed to record campfire open:", error.message);
    return null;
  }
  return typeof data === "string" ? data : null;
}

export async function recordCampfireListenProgress(
  listenId: string,
  progress: CampfireListenProgress
): Promise<void> {
  const { error } = await supabase.rpc("record_campfire_listen_progress", {
    p_listen_id: listenId,
    p_view_ms: Math.round(progress.viewMs),
    p_play_count: progress.playCount,
    p_listened_ms: Math.round(progress.listenedMs),
    p_max_position_ms: Math.round(progress.maxPositionMs),
    p_audio_duration_ms:
      progress.audioDurationMs != null
        ? Math.round(progress.audioDurationMs)
        : null,
    p_completed: progress.completed,
  });
  if (error) {
    console.warn("Failed to record campfire listen progress:", error.message);
  }
}
