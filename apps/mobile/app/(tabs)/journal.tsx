import React from "react";
import { View, Image, Pressable, StyleSheet, ImageBackground } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const BACKPACK_BG = require("@/assets/images/backpack-bg.png");

function BackpackTile({
  title,
  subtitle,
  cta,
  bgColor,
  art,
  artStyle,
  onPress,
}: {
  title: string;
  subtitle: string;
  cta: string;
  bgColor: string;
  art: number;
  artStyle: { width: number; height: number; right?: number; bottom?: number };
  onPress: () => void;
}) {
  const { scaleW } = useLayoutScale();

  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          backgroundColor: bgColor,
          borderRadius: scaleW(18),
          minHeight: scaleW(124),
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          borderWidth: 3,
          borderColor: "#FFF",
          elevation: 3,
        }}
      >
        <Image
          source={art}
          resizeMode="contain"
          style={{
            position: "absolute",
            bottom: artStyle.bottom ?? 0,
            right: artStyle.right ?? 0,
            ...artStyle,
          }}
        />
        <View
          style={{
            padding: scaleW(16),
            paddingRight: scaleW(122),
            flex: 1,
            gap: scaleW(8),
          }}
        >
          <View style={{ gap: scaleW(3) }}>
            <ThemedText
              type="heading"
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{ fontSize: scaleW(17), fontWeight: "800", lineHeight: scaleW(21) }}
            >
              {title}
            </ThemedText>
            <ThemedText
              lightColor="rgba(255,255,255,0.85)"
              darkColor="rgba(255,255,255,0.85)"
              style={{ fontSize: scaleW(14), fontWeight: "500", lineHeight: scaleW(18) }}
            >
              {subtitle}
            </ThemedText>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: scaleW(20),
              paddingVertical: scaleW(6),
              paddingHorizontal: scaleW(12),
              gap: scaleW(4),
            }}
          >
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{ fontSize: scaleW(14), fontWeight: "700" }}
            >
              {cta}
            </ThemedText>
            <MaterialIcons name="chevron-right" size={scaleW(14)} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function BackpackScreen() {
  const { scaleW } = useLayoutScale();

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ImageBackground source={BACKPACK_BG} style={styles.background} resizeMode="cover">
        <View style={[styles.tilesContainer, { gap: scaleW(14) }]}>
          <BackpackTile
            title="See your Journal"
            subtitle="Read your family stories"
            cta="Open"
            bgColor="#5B7FA6"
            art={require("@/assets/images/journal-bg.png")}
            artStyle={{ width: scaleW(118), height: scaleW(100) }}
            onPress={() => router.push("/(tabs)/journal-book")}
          />
          <BackpackTile
            title="Badges & Rewards"
            subtitle="Track badges you've earned"
            cta="View badges"
            bgColor="#62A94F"
            art={require("@/assets/images/backpack-badges-v2.png")}
            artStyle={{ width: scaleW(136), height: scaleW(120), right: -scaleW(25), bottom: -scaleW(10) }}
            onPress={() => router.push("/(tabs)/badges")}
          />
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  tilesContainer: {
    flex: 1,
    justifyContent: "center",
    width: "88%",
    alignSelf: "center",
  },
});
