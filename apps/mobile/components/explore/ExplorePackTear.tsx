/**
 * Pack foil tear: Skia jagged progressive rip when the native module is present,
 * otherwise an Image strip fallback (Expo Go / old binaries).
 */
import React, { useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

const PACK_FULL = require("@/assets/images/explore-pack-full.png");

/** Vertical foil strips for the Image progressive-rip fallback. */
const FALLBACK_STRIPS = 12;

export type PackTearProps = {
  width: number;
  height: number;
  splitY: number;
  openProgress: SharedValue<number>;
  foilOpacity: SharedValue<number>;
};

function hasSkiaNative(): boolean {
  try {
    // Avoid importing Skia until we know the native binary includes it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TurboModuleRegistry } = require("react-native");
    return TurboModuleRegistry.get("RNSkiaModule") != null;
  } catch {
    return false;
  }
}

const SKIA_AVAILABLE = hasSkiaNative();

type SkiaMod = typeof import("@/components/explore/ExplorePackTearSkia");

let SkiaTear: SkiaMod["ExplorePackTearSkia"] | null = null;
if (SKIA_AVAILABLE) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SkiaTear = require("@/components/explore/ExplorePackTearSkia").ExplorePackTearSkia;
  } catch {
    SkiaTear = null;
  }
}

function FallbackStrip({
  index,
  stripW,
  width,
  height,
  splitY,
  openProgress,
  foilOpacity,
}: {
  index: number;
  stripW: number;
  width: number;
  height: number;
  splitY: number;
  openProgress: SharedValue<number>;
  foilOpacity: SharedValue<number>;
}) {
  const start = index / (FALLBACK_STRIPS + 1.5);
  const end = (index + 2.2) / (FALLBACK_STRIPS + 1.5);
  const x0 = stripW * index;

  const style = useAnimatedStyle(() => {
    const p = openProgress.value;
    const local = interpolate(p, [start, end], [0, 1], Extrapolation.CLAMP);
    const visible = interpolate(local, [0, 0.02, 0.85, 1], [0, 1, 0.9, 0], Extrapolation.CLAMP);
    const packFade = interpolate(p, [0.82, 1], [1, 0], Extrapolation.CLAMP);
    return {
      opacity: visible * packFade * foilOpacity.value,
      transform: [
        {
          translateY: interpolate(
            local,
            [0, 1],
            [0, -splitY * 1.5 - 16 - index * 2],
            Extrapolation.CLAMP
          ),
        },
        {
          translateX: interpolate(local, [0, 1], [0, -4 - index * 1.2], Extrapolation.CLAMP),
        },
        {
          rotateZ: `${interpolate(local, [0, 1], [0, -10 - index], Extrapolation.CLAMP)}deg`,
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: x0,
          width: stripW + 1,
          height: splitY,
          overflow: "hidden",
          zIndex: 5,
        },
        style,
      ]}
    >
      <Image
        source={PACK_FULL}
        style={{ width, height, marginLeft: -x0 }}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />
    </Animated.View>
  );
}

/** Image-based progressive tear used when Skia isn’t in the running native binary. */
function PackTearImageFallback({
  width,
  height,
  splitY,
  openProgress,
  foilOpacity,
}: PackTearProps) {
  const stripW = width / FALLBACK_STRIPS;

  const bottomStyle = useAnimatedStyle(() => {
    const p = openProgress.value;
    return {
      opacity: interpolate(p, [0, 0.7, 1], [1, 1, 0.15], Extrapolation.CLAMP) * foilOpacity.value,
    };
  });

  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      {/* Pack body below the seal */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: splitY,
            left: 0,
            width,
            height: height - splitY,
            overflow: "hidden",
          },
          bottomStyle,
        ]}
      >
        <Image
          source={PACK_FULL}
          style={{ width, height, marginTop: -splitY }}
          resizeMode="stretch"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>

      <SealedImage
        width={width}
        height={height}
        openProgress={openProgress}
        foilOpacity={foilOpacity}
      />

      {Array.from({ length: FALLBACK_STRIPS }, (_, i) => (
        <FallbackStrip
          key={i}
          index={i}
          stripW={stripW}
          width={width}
          height={height}
          splitY={splitY}
          openProgress={openProgress}
          foilOpacity={foilOpacity}
        />
      ))}
    </View>
  );
}

function SealedImage({
  width,
  height,
  openProgress,
  foilOpacity,
}: {
  width: number;
  height: number;
  openProgress: SharedValue<number>;
  foilOpacity: SharedValue<number>;
}) {
  const wrapStyle = useAnimatedStyle(() => {
    const p = openProgress.value;
    const eased = interpolate(p, [0, 0.08, 1], [0, 0.06, 1], Extrapolation.CLAMP);
    const tearX = eased * width;
    return {
      opacity: foilOpacity.value,
      left: tearX,
      width: Math.max(0.5, width - tearX),
    };
  });

  const imageStyle = useAnimatedStyle(() => {
    const p = openProgress.value;
    const eased = interpolate(p, [0, 0.08, 1], [0, 0.06, 1], Extrapolation.CLAMP);
    const tearX = eased * width;
    return {
      marginLeft: -tearX,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          height,
          overflow: "hidden",
          zIndex: 3,
        },
        wrapStyle,
      ]}
    >
      <Animated.Image
        source={PACK_FULL}
        style={[{ width, height }, imageStyle]}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />
    </Animated.View>
  );
}

export function ExplorePackTear(props: PackTearProps) {
  const useSkia = useMemo(() => SKIA_AVAILABLE && SkiaTear != null, []);
  if (useSkia && SkiaTear) {
    return <SkiaTear {...props} />;
  }
  return <PackTearImageFallback {...props} />;
}

export const packTearStyles = StyleSheet.create({
  hitArea: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 20,
  },
});
