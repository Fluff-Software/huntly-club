import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { VideoPlayer } from "expo-video";
import type { VideoComponentData } from "@/services/campfireService";
import { CampfireVideo } from "./CampfireVideo";
import { resolveVideoMaximize } from "./campfireVideoLayout";

function fitFullscreenSize(
  stageW: number,
  stageH: number,
  player: VideoPlayer,
  maximize: "width" | "height"
): { w: number; h: number } | null {
  const track = player.videoTrack ?? player.availableVideoTracks[0];
  const vw = track?.size?.width;
  const vh = track?.size?.height;
  if (!vw || !vh || vw <= 0 || vh <= 0) return null;

  const aspect = vw / vh;
  if (maximize === "width") {
    let w = stageW;
    let h = w / aspect;
    if (h > stageH) {
      h = stageH;
      w = h * aspect;
    }
    return { w, h };
  }

  let h = stageH;
  let w = h * aspect;
  if (w > stageW) {
    w = stageW;
    h = w / aspect;
  }
  return { w, h };
}

type Props = {
  player: VideoPlayer;
  vData: VideoComponentData;
  stageWidth: number;
  stageHeight: number;
  slide: { opacity: number };
  zIndex: number;
  offsetSec: number;
  isPlaying: boolean;
};

/**
 * Fullscreen video — RN VideoView needs explicit pixel sizes (unlike HTML
 * `width:100%; height:auto`). Sizes from the video track + maximize option.
 */
export function CampfireFullscreenVideo({
  player,
  vData,
  stageWidth,
  stageHeight,
  slide,
  zIndex,
  offsetSec,
  isPlaying,
}: Props) {
  const maximize = resolveVideoMaximize(vData.maximize);
  const [size, setSize] = useState<{ w: number; h: number } | null>(() =>
    fitFullscreenSize(stageWidth, stageHeight, player, maximize)
  );

  useEffect(() => {
    const update = () => {
      const next = fitFullscreenSize(
        stageWidth,
        stageHeight,
        player,
        maximize
      );
      if (next) setSize(next);
    };
    update();
    const subs = [
      player.addListener("videoTrackChange", update),
      player.addListener("sourceLoad", update),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, [player, stageWidth, stageHeight, maximize]);

  return (
    <View
      style={{
        ...StyleSheet.absoluteFillObject,
        opacity: slide.opacity,
        zIndex,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CampfireVideo
        player={player}
        offsetSec={offsetSec}
        isPlaying={isPlaying}
        style={
          size
            ? { width: size.w, height: size.h }
            : StyleSheet.absoluteFillObject
        }
        contentFit={size ? "fill" : "contain"}
      />
    </View>
  );
}
