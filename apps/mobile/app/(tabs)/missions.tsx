import React, { useRef, useMemo } from "react";
import {
  View,
  ScrollView,
  Animated as RNAnimated,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { BackHeader } from "@/components/BackHeader";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useCurrentChapterActivities } from "@/hooks/useCurrentChapterActivities";
import { MissionCard } from "@/components/MissionCard";

const MISSIONS_ORANGE = "#D2684B";

export default function MissionsScreen() {
  const { scaleW, width } = useLayoutScale();
  const { activityCards, loading, error, refetch } = useCurrentChapterActivities();
  const missionCardsScrollX = useRef(new RNAnimated.Value(0)).current;
  const missionCardWidth = scaleW(270);
  const missionCardBorderWidth = 6;
  const missionCardGap = scaleW(12);
  const missionCardStep = missionCardWidth + missionCardGap;
  const missionCardsPaddingHorizontal = Math.max(0, Math.round((width - missionCardWidth) / 2));
  const getMissionCenterScrollX = (index: number) => index * missionCardStep;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: MISSIONS_ORANGE },
        scrollContent: {
          flexGrow: 1,
          backgroundColor: MISSIONS_ORANGE,
          justifyContent: "center" as const,
          paddingVertical: scaleW(12),
        },
        title: {
          fontSize: scaleW(24),
          lineHeight: scaleW(32),
          fontWeight: "600",
          color: "#FFF",
          textAlign: "center" as const,
          marginBottom: scaleW(12),
        },
        cardsScroll: { overflow: "visible" as const },
        cardsContent: {
          paddingLeft: missionCardsPaddingHorizontal,
          paddingRight: missionCardsPaddingHorizontal,
          paddingBottom: scaleW(4),
        },
        loadingContainer: {
          paddingVertical: scaleW(48),
          alignItems: "center" as const,
        },
        errorContainer: {
          paddingVertical: scaleW(24),
          paddingHorizontal: scaleW(24),
          alignItems: "center" as const,
        },
        errorText: { fontSize: scaleW(16), color: "#FFF", textAlign: "center" as const, marginBottom: scaleW(16) },
        retryButton: {
          backgroundColor: "#F4F0EB",
          borderRadius: scaleW(28),
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(32),
        },
        emptyText: { fontSize: scaleW(16), color: "#FFF", textAlign: "center" as const, opacity: 0.9 },
      }),
    [scaleW, width, missionCardsPaddingHorizontal]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={{ paddingHorizontal: scaleW(20), paddingBottom: scaleW(4), backgroundColor: MISSIONS_ORANGE }}>
        <BackHeader backToLabel="Clubhouse" variant="dark" />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <Animated.View entering={FadeInDown.duration(500).delay(0).springify().damping(18)}>
          <ThemedText type="heading" style={styles.title}>Missions</ThemedText>
        </Animated.View>
        <Animated.View
          entering={FadeInDown.duration(500).delay(280).springify().damping(18)}
          style={styles.cardsScroll}
        >
        <RNAnimated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsContent}
          style={{ overflow: "visible" }}
          nestedScrollEnabled={Platform.OS === "android"}
          removeClippedSubviews={false}
          overScrollMode="never"
          scrollEventThrottle={16}
          onScroll={RNAnimated.event(
            [{ nativeEvent: { contentOffset: { x: missionCardsScrollX } } }],
            { useNativeDriver: true }
          )}
          snapToInterval={missionCardStep}
          snapToAlignment="start"
          decelerationRate="fast"
        >
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFF" />
              <ThemedText style={[styles.emptyText, { marginTop: scaleW(16) }]}>Loading missions…</ThemedText>
            </View>
          )}
          {error && !loading && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <Pressable style={styles.retryButton} onPress={refetch}>
                <ThemedText type="heading" style={{ fontSize: scaleW(16), fontWeight: "600", color: "#2D5A27" }}>
                  Retry
                </ThemedText>
              </Pressable>
            </View>
          )}
          {!loading && !error && activityCards.length === 0 && (
            <View style={styles.loadingContainer}>
              <ThemedText style={styles.emptyText}>No missions for this chapter yet.</ThemedText>
            </View>
          )}
          {!loading && !error && activityCards.map((card, index) => {
            const centerScrollX = index === 0 ? 0 : getMissionCenterScrollX(index);
            const rotation = missionCardsScrollX.interpolate({
              inputRange: [
                centerScrollX - 120,
                centerScrollX,
                centerScrollX + 120,
              ],
              outputRange: ["-2deg", "0deg", "2deg"],
              extrapolate: "clamp",
            });
            return (
              <RNAnimated.View
                key={card.id}
                style={{
                  transform: [{ rotate: rotation }],
                }}
              >
                <MissionCard
                  card={card}
                  xp={card.xp}
                  tiltDeg={0}
                />
              </RNAnimated.View>
            );
          })}
        </RNAnimated.ScrollView>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
