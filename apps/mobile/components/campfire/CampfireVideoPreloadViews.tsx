import React from "react";
import { StyleSheet, View } from "react-native";
import { VideoView, type VideoPlayer } from "expo-video";

type Props = {
  players: Map<number, VideoPlayer>;
};

/**
 * Attaches each preloaded player to a VideoView while off-screen so the first
 * frame is decoded before the stage mounts (expo-video preloading pattern).
 * One view per player — required on Android (no sharing one view per player).
 */
export function CampfireVideoPreloadViews({ players }: Props) {
  if (players.size === 0) return null;

  return (
    <View pointerEvents="none" style={styles.host} accessibilityElementsHidden>
      {Array.from(players.entries()).map(([id, player]) => (
        <VideoView
          key={id}
          player={player}
          style={styles.pixel}
          nativeControls={false}
          contentFit="contain"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    overflow: "hidden",
    left: 0,
    top: 0,
  },
  pixel: {
    width: 1,
    height: 1,
  },
});
