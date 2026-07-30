import React from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { ACTIVITY_TYPES } from "@/constants/activityTypes";

const EXPLORE = ACTIVITY_TYPES.find((t) => t.key === "explore")!;

/** Clubhouse promo for Explore — sits above Things to do. */
export function ExplorePromoCard() {
  const { scaleW } = useLayoutScale();

  return (
    <Pressable
      onPress={() =>
        router.push("/(tabs)/activity/explore" as Parameters<typeof router.push>[0])
      }
      accessibilityRole="button"
      accessibilityLabel="Explore, new. Collect cards near you."
      style={({ pressed }) => (pressed ? { opacity: 0.9 } : undefined)}
    >
      <View
        style={{
          backgroundColor: EXPLORE.tint,
          borderRadius: scaleW(20),
          borderWidth: 3,
          borderColor: "#FFF",
          padding: scaleW(16),
          gap: scaleW(12),
          transform: [{ rotate: "0.7deg" }],
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
          overflow: "visible",
        }}
      >
        <View
          style={{
            position: "absolute",
            top: scaleW(-10),
            right: scaleW(14),
            backgroundColor: "#E07B20",
            borderRadius: scaleW(14),
            borderWidth: 2,
            borderColor: "#FFF",
            paddingHorizontal: scaleW(12),
            paddingVertical: scaleW(5),
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
            zIndex: 2,
          }}
        >
          <ThemedText
            style={{
              color: "#FFF",
              fontSize: scaleW(12),
              fontWeight: "900",
              letterSpacing: 1,
            }}
          >
            NEW!
          </ThemedText>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: scaleW(14) }}>
          <View
            style={{
              backgroundColor: "#FFF",
              borderRadius: scaleW(16),
              width: scaleW(52),
              height: scaleW(52),
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
              elevation: 1,
            }}
          >
            <MaterialIcons name={EXPLORE.icon} size={scaleW(28)} color={EXPLORE.color} />
          </View>

          <View style={{ flex: 1, gap: scaleW(3), paddingRight: scaleW(36) }}>
            <ThemedText
              type="heading"
              style={{ fontSize: scaleW(20), fontWeight: "900", color: EXPLORE.color }}
            >
              Explore
            </ThemedText>
            <ThemedText
              style={{
                fontSize: scaleW(13),
                lineHeight: scaleW(17),
                color: "rgba(0,0,0,0.55)",
                fontWeight: "600",
              }}
              numberOfLines={2}
            >
              Find nearby spots and collect cards for your binder!
            </ThemedText>
          </View>

          <MaterialIcons name="chevron-right" size={scaleW(26)} color={EXPLORE.color} />
        </View>
      </View>
    </Pressable>
  );
}
