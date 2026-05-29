import React, { useEffect, useState } from "react";
import { View, type ViewStyle } from "react-native";
import type { VideoPlayer } from "expo-video";
import { CampfireVideo } from "./CampfireVideo";

function intrinsicHeight(cardW: number, player: VideoPlayer): number | null {
  const track = player.videoTrack ?? player.availableVideoTracks[0];
  const w = track?.size?.width;
  const h = track?.size?.height;
  if (w && h && w > 0) return cardW * (h / w);
  return null;
}

function cardChrome(scale: (n: number) => number): ViewStyle {
  return {
    borderRadius: scale(16),
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  };
}

type Props = {
  player: VideoPlayer;
  cardW: number;
  scale: (n: number) => number;
  slide: { opacity: number; translateX: number; rotate: number };
  zIndex: number;
  offsetSec: number;
  isPlaying: boolean;
};

/**
 * Card-mode video with "original" ratio — border hugs intrinsic video size
 * (admin preview sets width only; height follows the asset).
 */
export function CampfireOriginalVideoCard({
  player,
  cardW,
  scale: s,
  slide,
  zIndex,
  offsetSec,
  isPlaying,
}: Props) {
  const [cardH, setCardH] = useState(() => intrinsicHeight(cardW, player) ?? cardW);

  useEffect(() => {
    const update = () => {
      const h = intrinsicHeight(cardW, player);
      if (h != null) setCardH(h);
    };
    update();
    const subs = [
      player.addListener("videoTrackChange", update),
      player.addListener("sourceLoad", update),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, [player, cardW]);

  return (
    <View
      style={{
        position: "absolute",
        top: s(80),
        left: "50%",
        width: cardW,
        height: cardH,
        opacity: slide.opacity,
        zIndex,
        transform: [
          { translateX: -cardW / 2 + slide.translateX },
          { rotate: `${slide.rotate}deg` },
        ],
        ...cardChrome(s),
      }}
    >
      <CampfireVideo
        player={player}
        offsetSec={offsetSec}
        isPlaying={isPlaying}
        style={{ width: cardW, height: cardH }}
        contentFit="fill"
      />
    </View>
  );
}
