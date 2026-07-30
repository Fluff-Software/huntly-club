/**
 * Skia pack foil with a progressive jagged tear at the perforation.
 * As openProgress advances (swipe), the rip travels L→R and already-torn
 * strips peel away — instead of lifting the whole top at once.
 *
 * Peel strips only animate after the tear front reaches them, so letters
 * on the seal never appear on flying bits before the finger gets there.
 */
import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import {
  Canvas,
  Group,
  Image as SkiaImage,
  Path,
  Skia,
  useImage,
  type SkPath,
} from "@shopify/react-native-skia";
import {
  Extrapolation,
  interpolate,
  useDerivedValue,
  type SharedValue,
} from "react-native-reanimated";

const PACK_FULL = require("@/assets/images/explore-pack-full.png");

/** How many vertical foil strips peel independently along the seal. */
const STRIP_COUNT = 16;

type Props = {
  width: number;
  height: number;
  /** Y of the SWIPE HERE split in display pixels. */
  splitY: number;
  openProgress: SharedValue<number>;
  foilOpacity: SharedValue<number>;
};

/** Deterministic irregular tear along y = splitY. */
function jaggedY(x: number, width: number, splitY: number): number {
  "worklet";
  const t = width <= 0 ? 0 : x / width;
  return (
    splitY +
    Math.sin(t * Math.PI * 13) * 3.2 +
    Math.sin(t * Math.PI * 29) * 1.6 +
    Math.cos(t * Math.PI * 7.5) * 2.4 +
    Math.sin(t * Math.PI * 47 + 0.4) * 1.1
  );
}

function buildBottomClip(
  width: number,
  height: number,
  splitY: number,
  segments = 28
): SkPath {
  const path = Skia.Path.Make();
  path.moveTo(0, jaggedY(0, width, splitY));
  for (let i = 1; i <= segments; i++) {
    const x = (width * i) / segments;
    path.lineTo(x, jaggedY(x, width, splitY));
  }
  path.lineTo(width, height);
  path.lineTo(0, height);
  path.close();
  return path;
}

/** Top strip slice between x0..x1, following the jagged bottom edge. */
function buildTopStripClip(
  x0: number,
  x1: number,
  width: number,
  splitY: number,
  segments = 4
): SkPath {
  const path = Skia.Path.Make();
  path.moveTo(x0, 0);
  path.lineTo(x1, 0);
  path.lineTo(x1, jaggedY(x1, width, splitY));
  for (let i = segments - 1; i >= 0; i--) {
    const x = x0 + ((x1 - x0) * i) / segments;
    path.lineTo(x, jaggedY(x, width, splitY));
  }
  path.close();
  return path;
}

type DebrisSpec = {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  dx: number;
  dy: number;
  appearAt: number;
};

function buildDebris(width: number, splitY: number): DebrisSpec[] {
  const seeds = [0.08, 0.18, 0.3, 0.42, 0.55, 0.68, 0.8, 0.92];
  return seeds.map((t, i) => {
    const x = width * t;
    const y = jaggedY(x, width, splitY);
    return {
      x,
      y,
      w: 4 + (i % 3) * 2.2,
      h: 2.5 + (i % 2) * 1.8,
      rot: (i % 2 === 0 ? -1 : 1) * (10 + i * 5),
      dx: (t - 0.5) * 70 + (i % 3) * 6,
      dy: -22 - i * 8,
      /** Appear when tear front reaches this x (0–1 of width). */
      appearAt: t,
    };
  });
}

function debrisPath(d: DebrisSpec): SkPath {
  const path = Skia.Path.Make();
  path.addRect(Skia.XYWHRect(-d.w / 2, -d.h / 2, d.w, d.h));
  return path;
}

type StripSpec = {
  index: number;
  x0: number;
  x1: number;
  midX: number;
  clip: SkPath;
};

function buildStrips(width: number, splitY: number): StripSpec[] {
  const strips: StripSpec[] = [];
  for (let i = 0; i < STRIP_COUNT; i++) {
    const x0 = (width * i) / STRIP_COUNT;
    const x1 = (width * (i + 1)) / STRIP_COUNT;
    strips.push({
      index: i,
      x0,
      x1,
      midX: (x0 + x1) / 2,
      clip: buildTopStripClip(x0, x1, width, splitY),
    });
  }
  return strips;
}

export function ExplorePackTearSkia({
  width,
  height,
  splitY,
  openProgress,
  foilOpacity,
}: Props) {
  const packImage = useImage(PACK_FULL);
  const peelPad = Math.max(140, splitY * 3.2);

  const bottomClip = useMemo(
    () => buildBottomClip(width, height, splitY),
    [width, height, splitY]
  );
  const strips = useMemo(() => buildStrips(width, splitY), [width, splitY]);
  const debris = useMemo(() => buildDebris(width, splitY), [width, splitY]);
  const debrisPaths = useMemo(() => debris.map(debrisPath), [debris]);

  /** Tear front X — advances with the swipe. */
  const tearFrontX = useDerivedValue(() => {
    const p = openProgress.value;
    const eased = interpolate(p, [0, 0.08, 1], [0, 0.06, 1], Extrapolation.CLAMP);
    return eased * width;
  });

  const sealedWidth = useDerivedValue(() => Math.max(0, width - tearFrontX.value));
  const sealedX = useDerivedValue(() => tearFrontX.value);

  const bottomOpacity = useDerivedValue(() => foilOpacity.value);
  const sealedOpacity = useDerivedValue(() => foilOpacity.value);

  if (!packImage) {
    return null;
  }

  return (
    <Canvas
      style={{
        position: "absolute",
        left: 0,
        top: -peelPad,
        width: width + 80,
        height: height + peelPad + 40,
        marginLeft: -40,
      }}
      pointerEvents="none"
    >
      <Group transform={[{ translateX: 40 }, { translateY: peelPad }]}>
        <Group opacity={bottomOpacity}>
          <Group clip={bottomClip}>
            <SkiaImage image={packImage} x={0} y={0} width={width} height={height} fit="fill" />
          </Group>
        </Group>

        <SealedFoil
          packImage={packImage}
          width={width}
          height={height}
          sealedX={sealedX}
          sealedWidth={sealedWidth}
          opacity={sealedOpacity}
        />

        {/* Peel only after tear front reaches each strip */}
        {strips.map((strip) => (
          <PeelStrip
            key={strip.index}
            strip={strip}
            packImage={packImage}
            width={width}
            height={height}
            splitY={splitY}
            tearFrontX={tearFrontX}
            foilOpacity={foilOpacity}
          />
        ))}

        {debris.map((d, i) => (
          <DebrisPiece
            key={i}
            path={debrisPaths[i]!}
            spec={d}
            foilOpacity={foilOpacity}
            tearFrontX={tearFrontX}
            width={width}
          />
        ))}
      </Group>
    </Canvas>
  );
}

function SealedFoil({
  packImage,
  width,
  height,
  sealedX,
  sealedWidth,
  opacity,
}: {
  packImage: NonNullable<ReturnType<typeof useImage>>;
  width: number;
  height: number;
  sealedX: SharedValue<number>;
  sealedWidth: SharedValue<number>;
  opacity: SharedValue<number>;
}) {
  const clip = useDerivedValue(() => {
    return Skia.XYWHRect(sealedX.value, 0, sealedWidth.value, height);
  });

  return (
    <Group opacity={opacity} clip={clip}>
      <SkiaImage image={packImage} x={0} y={0} width={width} height={height} fit="fill" />
    </Group>
  );
}

function PeelStrip({
  strip,
  packImage,
  width,
  height,
  splitY,
  tearFrontX,
  foilOpacity,
}: {
  strip: StripSpec;
  packImage: NonNullable<ReturnType<typeof useImage>>;
  width: number;
  height: number;
  splitY: number;
  tearFrontX: SharedValue<number>;
  foilOpacity: SharedValue<number>;
}) {
  const stripW = strip.x1 - strip.x0;

  /** Peel only once the tear has entered this strip — never ahead of the finger. */
  const localProgress = (tearX: number) => {
    "worklet";
    return interpolate(
      tearX,
      [strip.x0, strip.x1 + stripW * 0.65],
      [0, 1],
      Extrapolation.CLAMP
    );
  };

  const transform = useDerivedValue(() => {
    const local = localProgress(tearFrontX.value);
    const lift = interpolate(
      local,
      [0, 1],
      [0, -splitY * 1.6 - 18 - strip.index * 2],
      Extrapolation.CLAMP
    );
    const drift = interpolate(local, [0, 1], [0, -6 - strip.index * 1.4], Extrapolation.CLAMP);
    const rot = interpolate(
      local,
      [0, 1],
      [0, ((-12 - strip.index * 1.1) * Math.PI) / 180],
      Extrapolation.CLAMP
    );
    return [{ translateX: drift }, { translateY: lift }, { rotate: rot }];
  });

  const opacity = useDerivedValue(() => {
    const tearX = tearFrontX.value;
    // Stay invisible until the tear front reaches this strip.
    if (tearX < strip.x0) return 0;
    const local = localProgress(tearX);
    const visible = interpolate(local, [0, 0.08, 0.85, 1], [0, 1, 0.9, 0], Extrapolation.CLAMP);
    return visible * foilOpacity.value;
  });

  return (
    <Group
      opacity={opacity}
      transform={transform}
      origin={{ x: strip.midX, y: splitY * 0.35 }}
    >
      <Group clip={strip.clip}>
        <SkiaImage image={packImage} x={0} y={0} width={width} height={height} fit="fill" />
      </Group>
    </Group>
  );
}

function DebrisPiece({
  path,
  spec,
  foilOpacity,
  tearFrontX,
  width,
}: {
  path: SkPath;
  spec: DebrisSpec;
  foilOpacity: SharedValue<number>;
  tearFrontX: SharedValue<number>;
  width: number;
}) {
  const transform = useDerivedValue(() => {
    const tearT = width <= 0 ? 0 : tearFrontX.value / width;
    const local = interpolate(
      tearT,
      [spec.appearAt, Math.min(1, spec.appearAt + 0.18)],
      [0, 1],
      Extrapolation.CLAMP
    );
    return [
      { translateX: spec.x + interpolate(local, [0, 1], [0, spec.dx], Extrapolation.CLAMP) },
      { translateY: spec.y + interpolate(local, [0, 1], [0, spec.dy], Extrapolation.CLAMP) },
      {
        rotate: interpolate(local, [0, 1], [0, (spec.rot * Math.PI) / 180], Extrapolation.CLAMP),
      },
      { scale: interpolate(local, [0, 0.4, 1], [0.3, 1, 0.65], Extrapolation.CLAMP) },
    ];
  });

  const opacity = useDerivedValue(() => {
    const tearT = width <= 0 ? 0 : tearFrontX.value / width;
    if (tearT < spec.appearAt) return 0;
    const local = interpolate(
      tearT,
      [spec.appearAt, Math.min(1, spec.appearAt + 0.12), Math.min(1, spec.appearAt + 0.4)],
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    return local * foilOpacity.value;
  });

  return (
    <Group opacity={opacity} transform={transform}>
      <Path path={path} color="#2D5A3A" />
      <Path path={path} color="rgba(184, 240, 0, 0.45)" style="stroke" strokeWidth={0.8} />
    </Group>
  );
}

export const packTearStyles = StyleSheet.create({
  hitArea: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 20,
  },
});
