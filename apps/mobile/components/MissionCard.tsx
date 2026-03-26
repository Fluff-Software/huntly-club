import React, { useMemo } from "react";
import {
  View,
  Image,
  Pressable,
  StyleSheet,
  type ImageSourcePropType,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import type { MissionCardData } from "@/constants/missionCards";

const HUNTLY_GREEN = "#7FAF8A";
const COMPLETED_GREEN = "#2D5A27";

type MissionCardProps = {
  card: MissionCardData;
  xp?: number | null;
  tiltDeg?: number;
  marginTopOffset?: number;
  onStartPress?: () => void;
  showStartButton?: boolean;
  completed?: boolean;
  /** Number of this user's explorers who have completed this mission. */
  completionCount?: number;
  /** Total number of explorers (profiles) for this user. */
  totalExplorers?: number;
};

export function MissionCard({
  card,
  xp,
  tiltDeg = 0,
  marginTopOffset = 0,
  onStartPress,
  showStartButton = true,
  completed = false,
  completionCount = 0,
  totalExplorers = 0,
}: MissionCardProps) {
  const { scaleW } = useLayoutScale();
  const showCompletedBadge = completionCount > 0;
  const badgeText =
    totalExplorers > 0
      ? `Completed by ${completionCount}/${totalExplorers} Explorer${totalExplorers === 1 ? "" : "s"}`
      : `Completed by ${completionCount} Explorer${completionCount === 1 ? "" : "s"}`;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          width: scaleW(270),
          height: scaleW(370),
          marginRight: scaleW(12),
          transform: [{ rotate: `${tiltDeg}deg` }],
          marginTop: marginTopOffset,
        },
        inner: {
          width: "100%",
          height: "100%",
          backgroundColor: "#FFF",
          borderRadius: scaleW(24),
          padding: scaleW(12),
          borderWidth: 6,
          borderColor: completed ? COMPLETED_GREEN : HUNTLY_GREEN,
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        completedBadgeWrap: {
          position: "absolute" as const,
          top: scaleW(12),
          left: 0,
          right: 0,
          alignItems: "center" as const,
          zIndex: 1,
        },
        completedBadge: {
          flexDirection: "row" as const,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          backgroundColor: COMPLETED_GREEN,
          paddingHorizontal: scaleW(14),
          paddingVertical: scaleW(8),
          borderRadius: scaleW(20),
          gap: scaleW(6),
        },
        completedBadgeText: {
          fontSize: scaleW(13),
          fontWeight: "700" as const,
          color: "#FFF",
        },
        imageWrap: {
          width: "100%",
          height: scaleW(160),
          borderRadius: scaleW(14),
          overflow: "hidden" as const,
          marginBottom: scaleW(12),
          backgroundColor: "#1a1a2e",
        },
        image: { width: "100%", height: "100%" },
        titleRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: scaleW(8),
          gap: scaleW(8),
        },
        title: {
          fontSize: scaleW(18),
          fontWeight: "600",
          textAlign: "center",
          color: "#000",
          flex: 1,
        },
        pointsBadge: {
          backgroundColor: "#F5F0E8",
          paddingHorizontal: scaleW(10),
          paddingVertical: scaleW(6),
          borderRadius: scaleW(12),
          borderWidth: 1,
          borderColor: "#E5E7EB",
        },
        pointsText: {
          fontSize: scaleW(13),
          fontWeight: "600",
          color: "#374151",
        },
        description: {
          fontSize: scaleW(15),
          lineHeight: scaleW(20),
          marginBottom: scaleW(16),
          marginHorizontal: scaleW(8),
          textAlign: "center",
          color: "#000",
          flexShrink: 1,
        },
        startButton: {
          backgroundColor: completed ? COMPLETED_GREEN : HUNTLY_GREEN,
          borderRadius: scaleW(24),
          paddingVertical: scaleW(12),
          marginHorizontal: scaleW(24),
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        },
      }),
    [scaleW, tiltDeg, marginTopOffset, completed]
  );

  const handleStart = () => {
    if (onStartPress) {
      onStartPress();
    } else {
      router.push({
        pathname: "/(tabs)/activity/mission",
        params: { id: card.id },
      } as Parameters<typeof router.push>[0]);
    }
  };

  return (
    <View style={styles.outer}>
      <View style={styles.inner}>
        <View style={styles.imageWrap}>
          <Image
            source={card.image}
            style={styles.image}
            resizeMode="cover"
          />
          {showCompletedBadge && (
            <View style={styles.completedBadgeWrap}>
              <View style={styles.completedBadge}>
                <MaterialIcons name="check-circle" size={scaleW(18)} color="#FFF" />
                <ThemedText style={styles.completedBadgeText}>{badgeText}</ThemedText>
              </View>
            </View>
          )}
        </View>
        <View style={styles.titleRow}>
          <ThemedText type="heading" style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {card.title}
          </ThemedText>
          {xp != null && (
            <View style={styles.pointsBadge}>
              <ThemedText style={styles.pointsText}>{xp} Points</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={styles.description} numberOfLines={4} ellipsizeMode="tail">
          {card.description}
        </ThemedText>
        {showStartButton && (
          <Pressable style={styles.startButton} onPress={handleStart}>
            <ThemedText
              type="heading"
              style={{
                fontSize: scaleW(16),
                fontWeight: "600",
                color: "#FFF",
              }}
            >
              {completed ? "View" : "Start"}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}
