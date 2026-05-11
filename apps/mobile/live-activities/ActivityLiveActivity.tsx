import { HStack, Image, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity } from "expo-widgets";

export type ActivityLiveActivityProps = {
  sessionId: string;
  activityType: "walk" | "cycle";
  title: string;
  distance: string;
  elapsed: string;
  steps: string | null;
};

function ActivityLiveActivity(props: ActivityLiveActivityProps, environment: { colorScheme?: "light" | "dark" }) {
  "widget";

  const accentColor = environment.colorScheme === "dark" ? "#A8D5BA" : "#4F6F52";
  const iconName = props.activityType === "cycle" ? "bicycle" : "figure.walk";

  return {
    banner: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <HStack>
          <Image systemName={iconName} color={accentColor} />
          <Text modifiers={[font({ weight: "bold", size: 16 }), foregroundStyle(accentColor)]}>
            {props.title}
          </Text>
        </HStack>
        <Text>
          {props.distance} - {props.elapsed}
        </Text>
        {props.steps ? <Text>{props.steps}</Text> : null}
      </VStack>
    ),
    compactLeading: <Image systemName={iconName} color={accentColor} />,
    compactTrailing: <Text>{props.distance}</Text>,
    minimal: <Image systemName={iconName} color={accentColor} />,
    expandedLeading: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Image systemName={iconName} color={accentColor} />
        <Text>{props.activityType === "cycle" ? "Cycle" : "Walk"}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ weight: "bold", size: 18 })]}>{props.distance}</Text>
        <Text>{props.elapsed}</Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text>{props.title}</Text>
        {props.steps ? <Text>{props.steps}</Text> : null}
      </VStack>
    ),
  };
}

export default createLiveActivity("ActivityLiveActivity", ActivityLiveActivity);
