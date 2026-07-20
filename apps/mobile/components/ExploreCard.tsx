import React, { useEffect, useMemo } from "react";
import { View, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { DeviceMotion } from "expo-sensors";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import {
  EXPLORE_RARITY_COLORS,
  EXPLORE_SHEEN_GRADIENT,
  EXPLORE_SHINY_SHEEN_GRADIENT,
} from "@/constants/exploreColors";
import type { ExploreCollectible } from "@/services/exploreLocationService";

const CARD_ASPECT_RATIO = 1.4; // height / width, matches a trading-card proportion
const MAX_TILT_DEG = 7;
const MOTION_UPDATE_INTERVAL_MS = 60;

type ExploreCardProps = {
  collectible: Pick<ExploreCollectible, "name" | "image_url" | "rarity">;
  isShiny?: boolean;
  size?: number;
  /** Subscribes to DeviceMotion for a tilt-reactive holographic sheen. Keep false in dense grids
   * (e.g. binder thumbnails) to avoid running one motion listener per visible card. */
  interactiveTilt?: boolean;
  showName?: boolean;
};

export function ExploreCard({
  collectible,
  isShiny = false,
  size = 160,
  interactiveTilt = false,
  showName = true,
}: ExploreCardProps) {
  const { scaleW } = useLayoutScale();
  const rarityColor = EXPLORE_RARITY_COLORS[collectible.rarity];

  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const sheenOffset = useSharedValue(0);

  useEffect(() => {
    if (!interactiveTilt) return;

    let subscription: { remove: () => void } | null = null;
    DeviceMotion.setUpdateInterval(MOTION_UPDATE_INTERVAL_MS);
    subscription = DeviceMotion.addListener(({ rotation }) => {
      if (!rotation) return;
      const clampedBeta = Math.max(-1, Math.min(1, rotation.beta / (Math.PI / 4)));
      const clampedGamma = Math.max(-1, Math.min(1, rotation.gamma / (Math.PI / 4)));
      rotateX.value = withTiming(clampedBeta * MAX_TILT_DEG, { duration: 120 });
      rotateY.value = withTiming(clampedGamma * MAX_TILT_DEG, { duration: 120 });
      sheenOffset.value = withTiming(clampedGamma, { duration: 120 });
    });

    return () => {
      subscription?.remove();
      rotateX.value = withTiming(0, { duration: 200 });
      rotateY.value = withTiming(0, { duration: 200 });
      sheenOffset.value = withTiming(0, { duration: 200 });
    };
  }, [interactiveTilt, rotateX, rotateY, sheenOffset]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 600 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  const sheenAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sheenOffset.value * (size * 0.5) }, { rotate: "20deg" }],
  }));

  const width = size;
  const height = size * CARD_ASPECT_RATIO;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: { width, height },
        card: {
          width: "100%",
          height: "100%",
          borderRadius: scaleW(14),
          borderWidth: isShiny ? 4 : 3,
          borderColor: isShiny ? "#FFD700" : rarityColor,
          overflow: "hidden",
          backgroundColor: "#1a1a2e",
          shadowColor: isShiny ? "#FFD700" : "#000",
          shadowOpacity: isShiny ? 0.5 : 0.25,
          shadowRadius: isShiny ? 10 : 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
        image: { width: "100%", height: "100%" },
        sheenClip: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
        sheen: {
          position: "absolute",
          top: -height * 0.5,
          left: -width * 0.5,
          width: width * 2,
          height: height * 2,
        },
        name: {
          marginTop: scaleW(6),
          textAlign: "center",
          fontSize: scaleW(13),
          fontWeight: "700",
          color: "#1A2333",
        },
      }),
    [width, height, scaleW, isShiny, rarityColor]
  );

  return (
    <View style={styles.outer}>
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        <Image source={{ uri: collectible.image_url }} style={styles.image} resizeMode="cover" />
        {interactiveTilt && (
          <View style={styles.sheenClip} pointerEvents="none">
            <Animated.View style={[styles.sheen, sheenAnimatedStyle]}>
              <LinearGradient
                colors={isShiny ? EXPLORE_SHINY_SHEEN_GRADIENT : EXPLORE_SHEEN_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </View>
        )}
      </Animated.View>
      {showName && <ThemedText style={styles.name}>{collectible.name}</ThemedText>}
    </View>
  );
}
