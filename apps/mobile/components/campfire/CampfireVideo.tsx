import React, { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

type Props = {
  url: string;
  offsetSec: number;
  isPlaying: boolean;
  style?: StyleProp<ViewStyle>;
  contentFit?: "contain" | "cover" | "fill";
};

/**
 * A single timeline-synced video. Mounts when its component becomes active and
 * keeps its playback position aligned with the campfire clock.
 */
export function CampfireVideo({
  url,
  offsetSec,
  isPlaying,
  style,
  contentFit = "contain",
}: Props) {
  const player = useVideoPlayer({ uri: url }, (p) => {
    p.muted = false;
    p.timeUpdateEventInterval = 0.25;
  });

  // Play / pause with the timeline.
  useEffect(() => {
    if (!player) return;
    try {
      if (isPlaying) player.play();
      else player.pause();
    } catch {
      // ignore
    }
  }, [player, isPlaying]);

  // Keep the video roughly aligned with the timeline clock.
  useEffect(() => {
    if (!player) return;
    try {
      if (Math.abs(player.currentTime - offsetSec) > 0.3) {
        player.currentTime = offsetSec;
      }
    } catch {
      // ignore
    }
  }, [player, offsetSec]);

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
