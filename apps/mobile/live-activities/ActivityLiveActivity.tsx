import { Divider, HStack, Image, Label, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  background,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
} from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity } from "expo-widgets";

export type ActivityLiveActivityProps = {
  sessionId: string;
  activityType: "walk" | "cycle";
  title: string;
  distance: string;
  elapsed: string;
  steps: string | null;
  /** When true, show completion styling (e.g. after ending the session). */
  isComplete: boolean;
  /** Host app color scheme at update time; Live Activity UI adapts its palette. */
  colorScheme: "light" | "dark";
};

const HUNTLY_GREEN = "#4F6F52";
const FOREST_DARK = "#2D4A35";
const CREAM = "#F4F0EB";
const MINT_LIGHT = "#A8D5BA";

type ActivityPalette = {
  accent: string;
  headline: string;
  secondary: string;
  tertiary: string;
  iconWell: string;
  bannerTint: string;
  compactDistanceSize: number;
};

function activityPalette(colorScheme: "light" | "dark"): ActivityPalette {
  const dark = colorScheme === "dark";

  const accent = dark ? MINT_LIGHT : HUNTLY_GREEN;

  const headline = dark ? CREAM : FOREST_DARK;
  const secondary = dark ? "rgba(244,240,235,0.78)" : "rgba(45,74,53,0.72)";
  const tertiary = dark ? "rgba(244,240,235,0.55)" : "rgba(61,61,61,0.62)";

  const iconWell = dark ? "rgba(79,111,82,0.42)" : "rgba(79,111,82,0.18)";
  const bannerTint = dark ? "rgba(45,74,53,0.55)" : "rgba(244,240,235,0.92)";

  return {
    accent,
    headline,
    secondary,
    tertiary,
    iconWell,
    bannerTint,
    compactDistanceSize: 15,
  };
}

function activityIconName(props: ActivityLiveActivityProps) {
  if (props.isComplete) return "checkmark.circle.fill";
  return props.activityType === "cycle" ? "bicycle" : "figure.walk";
}

function ActivityLiveActivity(props?: ActivityLiveActivityProps) {
  "widget";

  const safe = props ?? {
    sessionId: "",
    activityType: "walk" as const,
    title: "Huntly World",
    distance: "—",
    elapsed: "—",
    steps: null,
    isComplete: false,
    colorScheme: "light" as const,
  };

  const p = activityPalette(safe.colorScheme);
  const iconName = activityIconName(safe);
  const activityWord = safe.activityType === "cycle" ? "Cycle" : "Walk";
  const compactTrailingText = safe.distance;

  const iconBadge = (
    <Image
      modifiers={[
        frame({ width: 40, height: 40 }),
        background(p.iconWell, shapes.roundedRectangle({ cornerRadius: 10, roundedCornerStyle: "continuous" })),
      ]}
      systemName={iconName}
      color={p.accent}
    />
  );

  const statsRow = (
    <HStack spacing={16} alignment="center">
      <Label
        modifiers={[font({ size: 13, weight: "semibold" }), foregroundStyle(p.headline)]}
        title={safe.distance}
        systemImage="arrow.left.and.right"
      />
      <Label
        modifiers={[font({ size: 13, weight: "semibold" }), foregroundStyle(p.headline)]}
        title={safe.elapsed}
        systemImage="clock"
      />
      {safe.steps ? (
        <Label
          modifiers={[font({ size: 13, weight: "semibold" }), foregroundStyle(p.headline)]}
          title={safe.steps}
          systemImage="figure.walk"
        />
      ) : null}
    </HStack>
  );

  const brandFootnote = (
    <Text modifiers={[font({ size: 11, weight: "medium" }), foregroundStyle(p.tertiary)]}>Huntly World</Text>
  );

  const bannerInner = (
    <VStack spacing={10} modifiers={[padding({ horizontal: 4, vertical: 2 })]}>
      <HStack spacing={12} alignment="center">
        {iconBadge}
        <VStack spacing={2}>
          <Text modifiers={[font({ size: 11, weight: "semibold" }), foregroundStyle(p.accent)]}>{activityWord}</Text>
          <Text modifiers={[font({ size: 17, weight: "bold" }), foregroundStyle(p.headline)]}>{safe.title}</Text>
        </VStack>
        <Spacer />
        <Text modifiers={[font({ size: 22, weight: "bold" }), foregroundStyle(p.accent)]}>{safe.distance}</Text>
      </HStack>
      <Divider />
      {statsRow}
      {brandFootnote}
    </VStack>
  );

  const banner = (
    <VStack modifiers={[padding({ all: 14 }), background(p.bannerTint, shapes.roundedRectangle({ cornerRadius: 16 }))]}>
      {bannerInner}
    </VStack>
  );

  const bannerSmall = (
    <HStack spacing={8} alignment="center" modifiers={[padding({ vertical: 4, horizontal: 2 })]}>
      <Image systemName={iconName} color={p.accent} />
      <Text modifiers={[font({ size: 13, weight: "semibold" }), foregroundStyle(p.headline)]}>
        {safe.distance} · {safe.elapsed}
        {safe.steps ? ` · ${safe.steps}` : ""}
      </Text>
    </HStack>
  );

  return {
    banner,
    bannerSmall,
    compactLeading: <Image systemName={iconName} color={p.accent} />,
    compactTrailing: (
      <Text
        modifiers={[
          font({ weight: "semibold", size: p.compactDistanceSize }),
          foregroundStyle(p.headline),
        ]}
      >
        {compactTrailingText}
      </Text>
    ),
    minimal: <Image systemName={iconName} color={p.accent} />,
    expandedLeading: (
      <VStack spacing={6} modifiers={[padding({ all: 10 })]}>
        {iconBadge}
        <Text modifiers={[font({ size: 12, weight: "semibold" }), foregroundStyle(p.secondary)]}>{activityWord}</Text>
      </VStack>
    ),
    expandedCenter: (
      <VStack spacing={4} alignment="center" modifiers={[padding({ vertical: 6 })]}>
        <Text modifiers={[font({ size: 26, weight: "bold" }), foregroundStyle(p.accent)]}>{safe.distance}</Text>
        <Text modifiers={[font({ size: 13, weight: "medium" }), foregroundStyle(p.secondary)]}>{safe.elapsed}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack spacing={6} alignment="trailing" modifiers={[padding({ all: 10 })]}>
        <Label
          modifiers={[font({ size: 12, weight: "semibold" }), foregroundStyle(p.headline)]}
          title={safe.distance}
          systemImage="arrow.left.and.right"
        />
        <Label
          modifiers={[font({ size: 12, weight: "semibold" }), foregroundStyle(p.headline)]}
          title={safe.elapsed}
          systemImage="clock"
        />
      </VStack>
    ),
    expandedBottom: (
      <VStack spacing={8} modifiers={[padding({ horizontal: 12, vertical: 10 })]}>
        <HStack spacing={8} alignment="center">
          <Text modifiers={[font({ size: 15, weight: "semibold" }), foregroundStyle(p.headline)]}>{safe.title}</Text>
          <Spacer />
          {brandFootnote}
        </HStack>
        {safe.steps ? (
          <Label
            modifiers={[font({ size: 13, weight: "medium" }), foregroundStyle(p.secondary)]}
            title={safe.steps}
            systemImage="figure.walk"
          />
        ) : null}
      </VStack>
    ),
  };
}

export default createLiveActivity("ActivityLiveActivity", ActivityLiveActivity);
