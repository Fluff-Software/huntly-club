/**
 * Skia pack foil with a progressive jagged tear at the perforation.
 * As openProgress advances (swipe), the rip travels L→R and already-torn
 * strips peel away — instead of lifting the whole top at once.
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

function buildFullTearEdge(width: number, splitY: number, segments = 32): SkPath {
  const path = Skia.Path.Make();
  path.moveTo(0, jaggedY(0, width, splitY));
  for (let i = 1; i <= segments; i++) {
    const x = (width * i) / segments;
    path.lineTo(x, jaggedY(x, width, splitY));
  }
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
      appearAt: t * 0.92,
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
  start: number;
  end: number;
};

function buildStrips(width: number, splitY: number): StripSpec[] {
  const strips: StripSpec[] = [];
  for (let i = 0; i < STRIP_COUNT; i++) {
    const x0 = (width * i) / STRIP_COUNT;
    const x1 = (width * (i + 1)) / STRIP_COUNT;
    // Rip wave: strip i peels as progress crosses its band, with overlap.
    const start = i / (STRIP_COUNT + 1.5);
    const end = (i + 2.2) / (STRIP_COUNT + 1.5);
    strips.push({
      index: i,
      x0,
      x1,
      midX: (x0 + x1) / 2,
      clip: buildTopStripClip(x0, x1, width, splitY),
      start,
      end,
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
  const tearEdge = useMemo(() => buildFullTearEdge(width, splitY), [width, splitY]);
  const strips = useMemo(() => buildStrips(width, splitY), [width, splitY]);
  const debris = useMemo(() => buildDebris(width, splitY), [width, splitY]);
  const debrisPaths = useMemo(() => debris.map(debrisPath), [debris]);

  /** Tear front X — advances with the swipe. */
  const tearFrontX = useDerivedValue(() => {
    const p = openProgress.value;
    const eased = interpolate(p, [0, 0.08, 1], [0, 0.06, 1], Extrapolation.CLAMP);
    return eased * width;
  });

  /** Still-sealed region width (right side). */
  const sealedWidth = useDerivedValue(() => Math.max(0, width - tearFrontX.value));

  const sealedX = useDerivedValue(() => tearFrontX.value);

  const bottomOpacity = useDerivedValue(() => {
    const p = openProgress.value;
    return (
      interpolate(p, [0, 0.7, 1], [1, 1, 0.15], Extrapolation.CLAMP) * foilOpacity.value
    );
  });

  const sealedOpacity = useDerivedValue(() => foilOpacity.value);

  const edgeOpacity = useDerivedValue(() => {
    const p = openProgress.value;
    return (
      interpolate(p, [0, 0.06, 0.75, 1], [0, 0.9, 0.75, 0], Extrapolation.CLAMP) *
      foilOpacity.value
    );
  });

  /** Clip the jagged edge stroke so it only shows along the revealed rip. */
  const edgeClipX = useDerivedValue(() => 0);
  const edgeClipW = useDerivedValue(() => Math.max(0, tearFrontX.value + 2));

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
        {/* Pack body below the perforation. */}
        <Group opacity={bottomOpacity}>
          <Group clip={bottomClip}>
            <SkiaImage image={packImage} x={0} y={0} width={width} height={height} fit="fill" />
          </Group>
        </Group>

        {/* Still-sealed right side — shrinks as the rip advances L→R. */}
        <SealedFoil
          packImage={packImage}
          width={width}
          height={height}
          sealedX={sealedX}
          sealedWidth={sealedWidth}
          opacity={sealedOpacity}
        />

        {/* Progressive foil strips: peel L→R with the swipe. */}
        {strips.map((strip) => (
          <PeelStrip
            key={strip.index}
            strip={strip}
            packImage={packImage}
            width={width}
            height={height}
            splitY={splitY}
            openProgress={openProgress}
            foilOpacity={foilOpacity}
          />
        ))}

        {/* Jagged foil edge along the revealed tear only. */}
        <Group opacity={edgeOpacity}>
          <Group
            clip={Skia.XYWHRect(0, splitY - 16, width, 36)}
          >
            {/* Mask edge by covering only [0, tearFront] via an overlapping clip rect */}
            <EdgeClip
              tearEdge={tearEdge}
              edgeClipX={edgeClipX}
              edgeClipW={edgeClipW}
              splitY={splitY}
            />
          </Group>
        </Group>

        {debris.map((d, i) => (
          <DebrisPiece
            key={i}
            path={debrisPaths[i]!}
            spec={d}
            openProgress={openProgress}
            foilOpacity={foilOpacity}
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

function EdgeClip({
  tearEdge,
  edgeClipX,
  edgeClipW,
  splitY,
}: {
  tearEdge: SkPath;
  edgeClipX: SharedValue<number>;
  edgeClipW: SharedValue<number>;
  splitY: number;
}) {
  const clip = useDerivedValue(() => {
    return Skia.XYWHRect(edgeClipX.value, splitY - 16, edgeClipW.value, 36);
  });

  return (
    <Group clip={clip}>
      <Path path={tearEdge} style="stroke" strokeWidth={2.8} color="rgba(5, 14, 8, 0.85)" />
      <Path path={tearEdge} style="stroke" strokeWidth={1.1} color="rgba(255, 255, 255, 0.3)" />
      <Path path={tearEdge} style="stroke" strokeWidth={1} color="rgba(184, 240, 0, 0.28)" />
    </Group>
  );
}

function PeelStrip({
  strip,
  packImage,
  width,
  height,
  splitY,
  openProgress,
  foilOpacity,
}: {
  strip: StripSpec;
  packImage: NonNullable<ReturnType<typeof useImage>>;
  width: number;
  height: number;
  splitY: number;
  openProgress: SharedValue<number>;
  foilOpacity: SharedValue<number>;
}) {
  const transform = useDerivedValue(() => {
    const p = openProgress.value;
    const local = interpolate(p, [strip.start, strip.end], [0, 1], Extrapolation.CLAMP);
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
    const p = openProgress.value;
    const local = interpolate(p, [strip.start, strip.end], [0, 1], Extrapolation.CLAMP);
    const visible = interpolate(local, [0, 0.02, 0.85, 1], [0, 1, 0.9, 0], Extrapolation.CLAMP);
    const packFade = interpolate(p, [0.82, 1], [1, 0], Extrapolation.CLAMP);
    return visible * packFade * foilOpacity.value;
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
  openProgress,
  foilOpacity,
}: {
  path: SkPath;
  spec: DebrisSpec;
  openProgress: SharedValue<number>;
  foilOpacity: SharedValue<number>;
}) {
  const transform = useDerivedValue(() => {
    const p = openProgress.value;
    const local = interpolate(
      p,
      [spec.appearAt, Math.min(1, spec.appearAt + 0.28)],
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
    const p = openProgress.value;
    const local = interpolate(
      p,
      [spec.appearAt, Math.min(1, spec.appearAt + 0.2), Math.min(1, spec.appearAt + 0.55)],
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
