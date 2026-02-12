import React, { useRef, useMemo } from "react";
import {
  View,
  ScrollView,
  Image,
  Animated as RNAnimated,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useFirstSeason } from "@/hooks/useFirstSeason";
import { useCurrentChapterActivities } from "@/hooks/useCurrentChapterActivities";
import { MissionCard } from "@/components/MissionCard";

const MISSIONS_ORANGE = "#D2684B";

export default function MissionsScreen() {
  const { scaleW, width } = useLayoutScale();
  const { heroImageSource } = useFirstSeason();
  const { activities, loading, error, refetch } = useCurrentChapterActivities();
  const missionCardsScrollX = useRef(new RNAnimated.Value(0)).current;
  const missionCardWidth = scaleW(270);
  const missionCardBorderWidth = 6;
  const missionCardMargin = scaleW(12);
  const missionCardGap = scaleW(12);
  const missionCardStep = missionCardWidth + missionCardMargin + missionCardGap;
  const missionCardsPaddingLeft = Math.max(0, (width - scaleW(280)) / 2);
  const getMissionCenterScrollX = (index: number) =>
    missionCardsPaddingLeft + index * missionCardStep + missionCardWidth / 2 + missionCardBorderWidth - width / 2;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: MISSIONS_ORANGE },
        scrollContent: {
          flexGrow: 1,
          backgroundColor: MISSIONS_ORANGE,
          paddingTop: scaleW(24),
        },
        imageCircleWrap: {
          width: width * 2.5,
          height: width * 2.5,
          borderRadius: (width * 2.5) / 2,
          overflow: "hidden" as const,
          marginBottom: scaleW(20),
          alignSelf: "center" as const,
          marginTop: -width * 2.1,
        },
        imageCircleImage: {
          width: "50%",
          height: "50%",
          marginTop: width * 1.6,
          alignSelf: "center" as const,
        },
        title: {
          fontSize: scaleW(28),
          lineHeight: scaleW(36),
          fontWeight: "600",
          color: "#FFF",
          textAlign: "center" as const,
          marginTop: scaleW(8),
          marginBottom: scaleW(24),
        },
        cardsScroll: { overflow: "visible" as const },
        cardsContent: {
          paddingLeft: Math.max(0, (width - scaleW(280)) / 2),
          paddingRight: scaleW(16),
          paddingBottom: scaleW(8),
          gap: scaleW(12),
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
    [scaleW, width]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(600).delay(0).springify().damping(18)}
          style={styles.imageCircleWrap}
        >
          <Image
            source={heroImageSource}
            resizeMode="contain"
            style={styles.imageCircleImage}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500).delay(150).springify().damping(18)}>
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
          {!loading && !error && activities.length === 0 && (
            <View style={styles.loadingContainer}>
              <ThemedText style={styles.emptyText}>No missions for this chapter yet.</ThemedText>
            </View>
          )}
          {!loading && !error && activities.map((card, index) => {
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
                  tiltDeg={0}
                />
              </RNAnimated.View>
            );
          })}
        </RNAnimated.ScrollView>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
