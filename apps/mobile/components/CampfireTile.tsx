import React from "react";
import { View, ImageBackground, Pressable } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const TILE_BG = require("@/assets/images/campfire-tile-bg.png");

const AMBER = "#C47A2A";
const BROWN_DEEP = "#3B1A06";
const BROWN_MID = "#6B3D1A";

export function CampfireTile() {
  const { scaleW } = useLayoutScale();

  return (
    <Pressable onPress={() => router.push("/(tabs)/campfire")}>
      {({ pressed }) => (
        <View
          style={{
            borderRadius: scaleW(20),
            minHeight: scaleW(140),
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            borderWidth: 3,
            borderColor: "#FFF",
            elevation: 4,
            opacity: pressed ? 0.9 : 1,
          }}
        >
          <ImageBackground
            source={TILE_BG}
            resizeMode="cover"
            style={{ flex: 1, minHeight: scaleW(140) }}
          >
            {/* Content — left-aligned, right side shows the character from the bg image */}
            <View
              style={{
                padding: scaleW(20),
                paddingRight: scaleW(140),
                justifyContent: "center",
                flex: 1,
                gap: scaleW(10),
              }}
            >
              {/* Label pill */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  backgroundColor: "rgba(196, 122, 42, 0.85)",
                  borderRadius: scaleW(20),
                  paddingVertical: scaleW(3),
                  paddingHorizontal: scaleW(10),
                  gap: scaleW(4),
                }}
              >
                <MaterialIcons name="local-fire-department" size={scaleW(13)} color="#FFF" />
                <ThemedText
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                  style={{ fontSize: scaleW(11), fontWeight: "700", letterSpacing: 0.5 }}
                >
                  CAMPFIRE
                </ThemedText>
              </View>

              {/* Title */}
              <View style={{ gap: scaleW(3) }}>
                <ThemedText
                  type="heading"
                  lightColor={BROWN_DEEP}
                  darkColor={BROWN_DEEP}
                  style={{ fontSize: scaleW(20), fontWeight: "800", lineHeight: scaleW(24) }}
                >
                  Watch the{"\n"}Previous Campfire
                </ThemedText>
                <ThemedText
                  lightColor={BROWN_MID}
                  darkColor={BROWN_MID}
                  style={{ fontSize: scaleW(13), fontWeight: "500" }}
                >
                  Stories, songs & adventures
                </ThemedText>
              </View>

              {/* Watch button pill */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  backgroundColor: AMBER,
                  borderRadius: scaleW(20),
                  paddingVertical: scaleW(7),
                  paddingHorizontal: scaleW(14),
                  gap: scaleW(6),
                }}
              >
                <MaterialIcons name="play-circle-filled" size={scaleW(16)} color="#FFF" />
                <ThemedText
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                  style={{ fontSize: scaleW(14), fontWeight: "700" }}
                >
                  Watch now
                </ThemedText>
              </View>
            </View>
          </ImageBackground>
        </View>
      )}
    </Pressable>
  );
}
