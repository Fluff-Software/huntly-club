import React from "react";
import { View, Image, Pressable } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";

export function AdventureTile() {
  const { scaleW } = useLayoutScale();

  return (
    <Pressable onPress={() => router.push("/(tabs)/activity/pick-activity")}>
      <View style={{
        backgroundColor: "#62A94F",
        borderRadius: scaleW(20),
        minHeight: scaleW(170),
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 3,
        borderColor: "#FFF",
        elevation: 3 }}>
        <Image
          source={require("@/assets/images/explore-bg.png")}
          resizeMode="contain"
          style={{ position: "absolute", bottom: 0, right: 0, width: scaleW(267), height: scaleW(200) }}
        />
        <View style={{ padding: scaleW(20), paddingRight: scaleW(130), justifyContent: "center", flex: 1, gap: scaleW(10) }}>
          <View style={{ gap: scaleW(4) }}>
            <ThemedText
              type="heading"
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{ fontSize: scaleW(20), fontWeight: "800", lineHeight: scaleW(24) }}
            >
              Go on an{"\n"}Adventure
            </ThemedText>
            <ThemedText
              lightColor="rgba(255,255,255,0.8)"
              darkColor="rgba(255,255,255,0.8)"
              style={{ fontSize: scaleW(16), fontWeight: "500" }}
            >
              Walk, cycle or mission
            </ThemedText>
          </View>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            backgroundColor: "rgba(255,255,255,0.2)",
            borderRadius: scaleW(20),
            paddingVertical: scaleW(7),
            paddingHorizontal: scaleW(14),
            gap: scaleW(4) }}>
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{ fontSize: scaleW(16), fontWeight: "700" }}
            >
              Let's go
            </ThemedText>
            <MaterialIcons name="chevron-right" size={scaleW(16)} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
