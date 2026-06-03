import React, { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { VideoView, type VideoPlayer } from "expo-video";
import {
  isVideoPlayerAlive,
  safePlayerCurrentTime,
  safePlayerPause,
  safePlayerPlay,
  safePlayerSeek,
} from "./campfireVideoPlayerUtils";

type Props = {
  player: VideoPlayer;
  offsetSec: number;
  isPlaying: boolean;
  style?: StyleProp<ViewStyle>;
  contentFit?: "contain" | "cover" | "fill";
};

/**
 * Renders a pre-created, already-buffered video player and keeps its playback
 * position aligned with the campfire timeline clock. Heavy seek/buffer work
 * happens in `campfireVideoPreload` before the stage is shown.
 */
export function CampfireVideo({
  player,
  offsetSec,
  isPlaying,
  style,
  contentFit = "contain",
}: Props) {
  useEffect(() => {
    if (!isVideoPlayerAlive(player)) return;

    try {
      const current = safePlayerCurrentTime(player);
      if (current != null && Math.abs(current - offsetSec) > 0.35) {
        safePlayerSeek(player, offsetSec);
      }

      if (isPlaying) {
        player.muted = false;
        player.volume = 1;
        player.audioMixingMode = "mixWithOthers";
        safePlayerPlay(player);
      } else {
        safePlayerPause(player);
      }
    } catch {
      // Player was released (e.g. session teardown) — ignore.
    }
  }, [player, isPlaying, offsetSec]);

  useEffect(() => {
    return () => {
      safePlayerPause(player);
    };
  }, [player]);

  if (!isVideoPlayerAlive(player)) {
    return null;
  }

  return (
    <VideoView
      player={player}
      style={style}
      contentFit={contentFit}
      nativeControls={false}
      pointerEvents="none"
    />
  );
}
