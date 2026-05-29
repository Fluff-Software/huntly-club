import React, { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { VideoView, type VideoPlayer } from "expo-video";

type Props = {
  player: VideoPlayer;
  offsetSec: number;
  isPlaying: boolean;
  style?: StyleProp<ViewStyle>;
  contentFit?: "contain" | "cover" | "fill";
};

/**
 * Renders a pre-created, already-buffered video player and keeps its playback
 * position aligned with the campfire timeline clock. The player itself is
 * created/preloaded by `useCampfireVideoPlayers` so the first frame is ready
 * before this view mounts.
 */
export function CampfireVideo({
  player,
  offsetSec,
  isPlaying,
  style,
  contentFit = "contain",
}: Props) {
  useEffect(() => {
    try {
      if (isPlaying) player.play();
      else player.pause();
    } catch {
      // ignore
    }
  }, [player, isPlaying]);

  useEffect(() => {
    try {
      if (Math.abs(player.currentTime - offsetSec) > 0.3) {
        player.currentTime = offsetSec;
      }
    } catch {
      // ignore
    }
  }, [player, offsetSec]);

  // Pause the shared player when this video leaves the screen.
  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        // ignore
      }
    };
  }, [player]);

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
