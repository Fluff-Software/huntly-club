import type { StyleProp, ViewStyle } from "react-native";
import type { VideoComponentData } from "@/services/campfireService";

/** Mirrors admin `CampfirePreview` video sizing. */
const CARD_SIZE_MAP: Record<string, number> = {
  square: 300,
  landscape: 300,
  portrait: 200,
  original: 300,
};

const CARD_ASPECT_MAP: Record<string, number | undefined> = {
  square: 1,
  landscape: 9 / 16,
  portrait: 16 / 9,
  original: undefined,
};

export type VideoCardLayout = {
  contentFit: "contain" | "cover";
  /** When true, height is derived from the video track (original ratio). */
  usesIntrinsicSize: boolean;
  cardW: number;
  outerStyle: ViewStyle;
  innerStyle: ViewStyle | null;
  videoStyle: StyleProp<ViewStyle>;
};

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

export function resolveVideoMaximize(
  maximize: VideoComponentData["maximize"]
): "width" | "height" {
  return maximize === "width" ? "width" : "height";
}

/** Card-mode layout aligned with admin preview (`left-1/2`, ratio boxes, original = width only). */
export function getVideoCardLayout(
  vData: VideoComponentData,
  scale: (n: number) => number,
  slide: { opacity: number; translateX: number; rotate: number },
  layerZIndex: number
): VideoCardLayout {
  const ratio = vData.videoRatio || "original";
  const cardW = scale(CARD_SIZE_MAP[ratio] ?? 300);
  const aspect = CARD_ASPECT_MAP[ratio];
  const cardH = aspect != null ? cardW * aspect : undefined;
  const contentFit = ratio === "original" ? "contain" : "cover";

  const outerStyle: ViewStyle = {
    position: "absolute",
    top: scale(80),
    left: "50%",
    width: cardW,
    opacity: slide.opacity,
    zIndex: layerZIndex,
    transform: [
      { translateX: -cardW / 2 + slide.translateX },
      { rotate: `${slide.rotate}deg` },
    ],
  };

  if (cardH != null) {
    return {
      contentFit,
      usesIntrinsicSize: false,
      cardW,
      outerStyle,
      innerStyle: {
        width: cardW,
        height: cardH,
        ...cardChrome(scale),
      },
      videoStyle: { width: "100%", height: "100%" },
    };
  }

  return {
    contentFit,
    usesIntrinsicSize: true,
    cardW,
    outerStyle,
    innerStyle: null,
    videoStyle: {},
  };
}
