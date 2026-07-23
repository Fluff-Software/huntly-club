import React from "react";
import { View, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { getAvailableActivityTypes } from "@/constants/activityTypes";

const SEE_ALL_COLOR = "#1A5C6B";

export function ThingsToDoRow() {
  const { scaleW } = useLayoutScale();
  const available = getAvailableActivityTypes(Platform.OS);
  const shown = available.slice(0, 2);
  const remaining = available.length - shown.length;

  return (
    <View
      style={{
        backgroundColor: "rgba(255,255,255,0.95)",
        borderRadius: scaleW(20),
        borderWidth: 2,
        borderColor: "#FFF",
        padding: scaleW(16),
        gap: scaleW(12),
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <View>
          <ThemedText type="heading" style={{ fontSize: scaleW(16), fontWeight: "700", color: "#333" }}>
            Things to do
          </ThemedText>
          <ThemedText style={{ fontSize: scaleW(12), color: "#888", marginTop: scaleW(2) }}>
            Ways to earn today
          </ThemedText>
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/activity/pick-activity")}
          hitSlop={8}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <ThemedText style={{ fontSize: scaleW(13), fontWeight: "700", color: "#4F6F52" }}>
            See all
          </ThemedText>
          <MaterialIcons name="chevron-right" size={scaleW(16)} color="#4F6F52" />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: scaleW(10), alignItems: "flex-start" }}>
        {shown.map((type, index) => (
          <View key={type.key} style={{ flex: 1, transform: [{ rotate: index % 2 === 0 ? "-1.5deg" : "1.5deg" }] }}>
            <Pressable
              onPress={() => router.push(type.route as Parameters<typeof router.push>[0])}
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
              <View
                style={{
                  backgroundColor: type.tint,
                  borderRadius: scaleW(18),
                  borderWidth: 2,
                  borderColor: "#FFF",
                  padding: scaleW(14),
                  gap: scaleW(8),
                  minHeight: scaleW(118),
                  shadowColor: "#000",
                  shadowOpacity: 0.12,
                  shadowRadius: 3,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#FFF",
                    borderRadius: scaleW(14),
                    width: scaleW(40),
                    height: scaleW(40),
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  }}
                >
                  <MaterialIcons name={type.icon} size={scaleW(22)} color={type.color} />
                </View>
                <View style={{ gap: scaleW(2) }}>
                  <ThemedText type="heading" style={{ fontSize: scaleW(14), fontWeight: "800", color: type.color }}>
                    {type.label}
                  </ThemedText>
                  <ThemedText
                    style={{ fontSize: scaleW(11), lineHeight: scaleW(14), color: "rgba(0,0,0,0.45)" }}
                    numberOfLines={2}
                  >
                    {type.description}
                  </ThemedText>
                </View>
              </View>
            </Pressable>
          </View>
        ))}

        <View style={{ flex: 1, transform: [{ rotate: "1.5deg" }] }}>
          <Pressable
            onPress={() => router.push("/(tabs)/activity/pick-activity")}
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <View
              style={{
                backgroundColor: SEE_ALL_COLOR,
                borderRadius: scaleW(18),
                borderWidth: 2,
                borderColor: "#FFF",
                padding: scaleW(14),
                gap: scaleW(8),
                minHeight: scaleW(118),
                justifyContent: "space-between",
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: scaleW(14),
                  width: scaleW(40),
                  height: scaleW(40),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="explore" size={scaleW(22)} color="#FFF" />
              </View>
              <View style={{ gap: scaleW(2) }}>
                <ThemedText type="heading" style={{ fontSize: scaleW(14), fontWeight: "800", color: "#FFF" }}>
                  See all
                </ThemedText>
                <ThemedText style={{ fontSize: scaleW(11), color: "rgba(255,255,255,0.75)" }}>
                  {remaining > 0 ? `+${remaining} more way${remaining === 1 ? "" : "s"}` : "Every way to earn"}
                </ThemedText>
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
