import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  ScrollView,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useFirstSeason } from "@/hooks/useFirstSeason";
import { useCurrentChapterActivities } from "@/hooks/useCurrentChapterActivities";
import { getCategoryLabel } from "@/utils/categoryUtils";

const DEG = Math.PI / 180;
const springBounce = { damping: 5, stiffness: 90 };
const HUNTLY_GREEN = "#4F6F52";
const CREAM = "#F4F0EB";
const DARK_GREEN = "#2D5A27";

const INTRO_PAGES = [
  {
    id: "1",
    type: "whispering-wind" as const,
  },
  {
    id: "2",
    type: "laser-fortress" as const,
  },
];

function storyToParagraphs(story: string | null): string[] {
  if (!story || !story.trim()) return [];
  return story.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

const DESCRIPTION_ELLIPSE_LINES = 3;

export default function SignUpIntroScreen() {
  const { scaleW, width, height } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const { firstSeason, heroImageSource, loading: seasonLoading, error: seasonError, refetch: refetchSeason } = useFirstSeason();
  const { activityCards, loading: activitiesLoading, error: activitiesError, refetch: refetchActivities } = useCurrentChapterActivities();
  const flatListRef = useRef<FlatList>(null);

  const loading = seasonLoading || activitiesLoading;
  const error = seasonError ?? activitiesError;

  const handleRetry = useCallback(() => {
    refetchSeason();
    refetchActivities();
  }, [refetchSeason, refetchActivities]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondCardHeight, setSecondCardHeight] = useState(0);
  const hasAnimatedCards = useRef(false);

  const card1Rotate = useSharedValue(7.5 * DEG);
  const card2Rotate = useSharedValue(-4 * DEG);
  const openCardsScale = useSharedValue(1);
  const dashboardScale = useSharedValue(1);

  const card1Style = useAnimatedStyle(() => ({ transform: [{ rotate: `${card1Rotate.value}rad` }] }));
  const card2Style = useAnimatedStyle(() => ({ transform: [{ rotate: `${card2Rotate.value}rad` }] }));
  const openCardsAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: openCardsScale.value }] }));
  const dashboardAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: dashboardScale.value }] }));

  useEffect(() => {
    if (currentIndex !== 1 || hasAnimatedCards.current) return;
    hasAnimatedCards.current = true;
    card1Rotate.value = withDelay(0, withSpring(3 * DEG, springBounce));
    card2Rotate.value = withDelay(150, withSpring(0, springBounce));
  }, [currentIndex]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const goNext = () => {
    if (currentIndex < INTRO_PAGES.length - 1) {
      flatListRef.current?.scrollToOffset({
        offset: (currentIndex + 1) * width,
        animated: true,
      });
    } else {
      router.push("/(tabs)");
    }
  };

  const renderPage = ({
    item,
    index,
  }: {
    item: (typeof INTRO_PAGES)[0];
    index: number;
  }) => {
    if (item.type === "whispering-wind") {
      if (!firstSeason) return null;
      const topInset = Math.max(insets.top, scaleW(20));
      const bottomInset = Math.max(insets.bottom, scaleW(20));
      return (
        <View style={{ width, flex: 1, backgroundColor: "#FFFFFF", paddingTop: topInset }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: scaleW(28),
              paddingTop: scaleW(20),
              paddingBottom: scaleW(20),
            }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(500).delay(0).springify().damping(18)}>
              <Text
                style={{
                  color: "#1F2937",
                  textAlign: "center",
                  fontWeight: "700",
                  fontSize: scaleW(17),
                  marginBottom: scaleW(6),
                  letterSpacing: 0.2,
                }}
              >
                This latest season is here!
              </Text>
              <Text
                style={{
                  color: "#6B7280",
                  textAlign: "center",
                  fontSize: scaleW(15),
                  marginBottom: scaleW(16),
                }}
              >
                Your new season is ready to view
              </Text>
              <Text
                style={{
                  color: "#1F2937",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: scaleW(28),
                  marginBottom: scaleW(20),
                }}
              >
                {firstSeason.name}
              </Text>
              <View
                style={{
                  alignSelf: "center",
                  width: scaleW(200),
                  height: scaleW(200),
                  borderRadius: scaleW(100),
                  overflow: "hidden",
                  marginBottom: scaleW(20),
                  backgroundColor: "#F3F4F6",
                }}
              >
                <Image
                  source={heroImageSource}
                  resizeMode="cover"
                  style={{ width: "100%", height: "100%" }}
                />
              </View>
              <View style={{ maxWidth: scaleW(320), alignSelf: "center" }}>
                {storyToParagraphs(firstSeason.story).map((paragraph, i, arr) => (
                  <Text
                    key={i}
                    style={{
                      color: "#4B5563",
                      textAlign: "center",
                      fontSize: scaleW(15),
                      lineHeight: scaleW(22),
                      marginBottom: i === arr.length - 1 ? 0 : scaleW(12),
                    }}
                  >
                    {paragraph}
                  </Text>
                ))}
              </View>
            </Animated.View>
          </ScrollView>
          <View
            style={{
              paddingHorizontal: scaleW(28),
              paddingTop: scaleW(20),
              paddingBottom: bottomInset,
              backgroundColor: "#FFFFFF",
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: "#E5E7EB",
            }}
          >
            <Animated.View entering={FadeInDown.duration(500).delay(280).springify().damping(18)} style={openCardsAnimatedStyle}>
              <Pressable
                onPress={goNext}
                onPressIn={() => { openCardsScale.value = withSpring(0.96, { damping: 15, stiffness: 400 }); }}
                onPressOut={() => { openCardsScale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
                style={{
                  width: "100%",
                  paddingVertical: scaleW(16),
                  borderRadius: scaleW(28),
                  backgroundColor: HUNTLY_GREEN,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: scaleW(16),
                    fontWeight: "600",
                  }}
                >
                  Open adventure cards
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      );
    }

    const card = activityCards[0];
    const showCard = !!card && !activitiesLoading && !activitiesError;

    return (
      <View style={{ width, height, backgroundColor: "#F5F0E8" }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: scaleW(24),
            paddingTop: scaleW(24),
            paddingBottom: scaleW(100),
          }}
          showsVerticalScrollIndicator={true}
        >
        {firstSeason && (
          <>
            <View
              style={{
                width: width * 2.5,
                height: width * 2.5,
                borderRadius: "50%",
                overflow: "hidden",
                marginBottom: scaleW(20),
                alignSelf: "center",
                marginTop: -width * 2.1,
              }}
            >
              <Image
                source={heroImageSource}
                resizeMode="contain"
                style={{ width: "50%", height: "50%", marginTop: width * 1.6, alignSelf: "center" }}
              />
            </View>
            <Animated.View entering={FadeInDown.duration(500).delay(0).springify().damping(18)}>
              <Text
                style={{
                  color: "#1F2937",
                  textAlign: "center",
                  fontWeight: "400",
                  fontSize: scaleW(30),
                  marginBottom: scaleW(24),
                }}
              >
                {firstSeason.name}
              </Text>
            </Animated.View>
          </>
        )}
        {activitiesLoading && (
          <View style={[styles.centerBox, { paddingVertical: scaleW(48) }]}>
            <ActivityIndicator size="large" color={HUNTLY_GREEN} />
            <Text style={[styles.messageText, { marginTop: scaleW(16) }]}>Loading adventure cards…</Text>
          </View>
        )}
        {activitiesError && !activitiesLoading && (
          <View style={[styles.centerBox, { paddingVertical: scaleW(48) }]}>
            <Text style={styles.messageText}>{activitiesError}</Text>
            <Pressable onPress={handleRetry} style={[styles.retryButton, { marginTop: scaleW(24) }]}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}
        {!activitiesLoading && !activitiesError && activityCards.length === 0 && (
          <View style={[styles.centerBox, { paddingVertical: scaleW(48) }]}>
            <Text style={styles.messageText}>No activities in this chapter yet.</Text>
          </View>
        )}
        {showCard && (
          <View style={{ marginBottom: scaleW(56) }}>
            <Animated.View
              style={[
                card1Style,
                {
                  position: "absolute",
                  top: scaleW(5),
                  width: width * 0.9,
                  height: secondCardHeight || height * 0.44,
                  marginBottom: scaleW(24),
                },
              ]}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#6AE6AE",
                  borderRadius: scaleW(20),
                  padding: scaleW(15),
                  borderWidth: 4,
                  borderColor: "#FFF",
                  shadowColor: "#000",
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                  overflow: "hidden",
                }}
              />
            </Animated.View>
            <Animated.View style={card2Style}>
              <View
                onLayout={(e: LayoutChangeEvent) => setSecondCardHeight(e.nativeEvent.layout.height)}
                style={{
                  width: width * 0.9,
                  backgroundColor: "#E6A46A",
                  borderRadius: scaleW(20),
                  padding: scaleW(15),
                  borderWidth: 4,
                  borderColor: "#FFF",
                  shadowColor: "#000",
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: scaleW(12),
                  }}
                >
                  <Text
                    style={{
                      color: "#5C4033",
                      fontWeight: "700",
                      fontSize: scaleW(18),
                    }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {card.title}
                  </Text>
                  <View
                    style={{
                      backgroundColor: "#FFF",
                      paddingHorizontal: scaleW(12),
                      paddingVertical: scaleW(6),
                      borderRadius: scaleW(12),
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Text
                      style={{
                        color: "#374151",
                        fontSize: scaleW(13),
                        fontWeight: "600",
                      }}
                    >
                      {card.xp ?? 0} Points
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    height: scaleW(160),
                    borderRadius: scaleW(12),
                    overflow: "hidden",
                    marginBottom: scaleW(12),
                  }}
                >
                  <Image
                    source={card.image}
                    resizeMode="cover"
                    style={{ width: "100%", height: "100%", backgroundColor: "#1a1a2e" }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    gap: scaleW(8),
                    marginBottom: scaleW(12),
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {card.categories.slice(0, 4).map((cat) => (
                    <View
                      key={cat}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: scaleW(6),
                        paddingHorizontal: scaleW(10),
                        paddingVertical: scaleW(6),
                        borderRadius: scaleW(20),
                        backgroundColor: "#F5F0E8",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      <Text style={{ color: "#374151", fontSize: scaleW(13) }}>
                        {getCategoryLabel(cat)}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text
                  style={{
                    color: "#5C4033",
                    fontSize: scaleW(14),
                    lineHeight: scaleW(20),
                    paddingVertical: scaleW(16),
                    paddingHorizontal: scaleW(36),
                    backgroundColor: "#FFF",
                    borderRadius: scaleW(8),
                    textAlign: "center",
                  }}
                  numberOfLines={DESCRIPTION_ELLIPSE_LINES}
                  ellipsizeMode="tail"
                >
                  {card.description}
                </Text>
              </View>
            </Animated.View>
          </View>
        )}
        <Animated.View entering={FadeInDown.duration(500).delay(380).springify().damping(18)} style={dashboardAnimatedStyle}>
          <Pressable
            onPress={goNext}
            onPressIn={() => { dashboardScale.value = withSpring(0.96, { damping: 15, stiffness: 400 }); }}
            onPressOut={() => { dashboardScale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
            style={{
              alignSelf: "center",
              width: "100%",
              maxWidth: scaleW(320),
              paddingVertical: scaleW(16),
              borderRadius: scaleW(50),
              backgroundColor: HUNTLY_GREEN,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: scaleW(16), fontWeight: "600" }}>
              Home
            </Text>
          </Pressable>
        </Animated.View>
        </ScrollView>
      </View>
    );
  };

  const styles = StyleSheet.create({
    centerBox: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: scaleW(24),
    },
    messageText: {
      fontSize: scaleW(16),
      color: "#374151",
      textAlign: "center",
    },
    retryButton: {
      backgroundColor: CREAM,
      borderRadius: scaleW(28),
      paddingVertical: scaleW(14),
      paddingHorizontal: scaleW(32),
    },
    retryButtonText: {
      fontSize: scaleW(16),
      fontWeight: "600",
      color: DARK_GREEN,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F0E8" }} edges={["top", "left", "right"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <StatusBar style="dark" />
          <Stack.Screen options={{ title: "Welcome", headerShown: false, gestureEnabled: false }} />
          <ActivityIndicator size="large" color={HUNTLY_GREEN} />
          <Text style={[styles.messageText, { marginTop: scaleW(16) }]}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F0E8" }} edges={["top", "left", "right"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: scaleW(24) }}>
          <StatusBar style="dark" />
          <Stack.Screen options={{ title: "Welcome", headerShown: false, gestureEnabled: false }} />
          <Text style={styles.messageText}>{error}</Text>
          <Pressable onPress={handleRetry} style={[styles.retryButton, { marginTop: scaleW(24) }]}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!firstSeason) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F0E8" }} edges={["top", "left", "right"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: scaleW(24) }}>
          <StatusBar style="dark" />
          <Stack.Screen options={{ title: "Welcome", headerShown: false, gestureEnabled: false }} />
          <Text style={styles.messageText}>No season available.</Text>
          <Pressable onPress={handleRetry} style={[styles.retryButton, { marginTop: scaleW(24) }]}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ title: "Welcome", headerShown: false, gestureEnabled: false }} />
      <FlatList
        ref={flatListRef}
        data={INTRO_PAGES}
        renderItem={renderPage}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      />
    </View>
    </SafeAreaView>
  );
}
