import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { SCAVENGER_GREEN } from "@/constants/scavengerTheme";
import { useLayoutScale } from "@/hooks/useLayoutScale";

export type QuestView = "list" | "map";

type Props = {
  value: QuestView;
  onChange: (view: QuestView) => void;
};

const SEGMENTS: {
  id: QuestView;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { id: "list", label: "List", icon: "grid-view" },
  { id: "map", label: "Map", icon: "place" },
];

/** Floating List / Map toggle for the active hunt screen. */
export function QuestViewSwitcher({ value, onChange }: Props) {
  const { scaleW } = useLayoutScale();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.shell,
        {
          borderRadius: scaleW(28),
          padding: scaleW(4),
        },
      ]}
    >
      {SEGMENTS.map((segment) => {
        const active = value === segment.id;
        const iconColor = active ? "#FFFFFF" : "#5A6B5E";
        return (
          <Pressable
            key={segment.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={segment.label}
            onPress={() => onChange(segment.id)}
            style={[
              styles.segment,
              {
                minHeight: scaleW(44),
                paddingHorizontal: scaleW(18),
                borderRadius: scaleW(24),
                gap: scaleW(6),
              },
              active && styles.segmentActive,
            ]}
          >
            <MaterialIcons name={segment.icon} size={scaleW(18)} color={iconColor} />
            <ThemedText
              style={{
                fontWeight: "700",
                fontSize: scaleW(14),
                color: active ? "#fff" : "#5A6B5E",
              }}
            >
              {segment.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: SCAVENGER_GREEN,
  },
});
