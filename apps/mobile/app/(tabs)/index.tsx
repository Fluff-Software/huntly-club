import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  Image,
  ImageBackground,
  Animated,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import AnimatedReanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { MissionCard } from "@/components/MissionCard";
import { StatCard } from "@/components/StatCard";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { MISSION_CARDS } from "@/constants/missionCards";

type HomeMode = "profile" | "activity" | "missions";
const HOME_MODES: HomeMode[] = ["profile", "activity", "missions"];

const BG_IMAGE = require("@/assets/images/bg.png");
const BEAR_WAVE_IMAGE = require("@/assets/images/bear-wave.png");
const CLUB_1_IMAGE = require("@/assets/images/club-1.png");
const CLUB_2_IMAGE = require("@/assets/images/club-2.png");

const CREAM = "#F4F0EB";
const ORANGE_BANNER = "#EBCDBB";

export default function HomeScreen() {
  const { scaleW, width, height } = useLayoutScale();
  const initialIndex = 1; // activity (Welcome back)
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const currentMode = HOME_MODES[currentIndex] ?? "activity";

  const pagerRef = useRef<ScrollView>(null);
  const pagerX = useRef(new Animated.Value(width * initialIndex)).current;
  const backgroundTranslateX = Animated.multiply(pagerX, -1);

  const clubCardsScrollX = useRef(new Animated.Value(0)).current;
  const cardWidth = scaleW(250);
  const cardBorderWidth = 2;
  const cardMargin = scaleW(12);
  const cardGap = scaleW(12);
  const cardStep = cardWidth + cardMargin + cardGap;
  const cardsPaddingLeft = (width - scaleW(48) - cardWidth) / 2;
  const getCenterScrollX = (index: number) =>
    cardsPaddingLeft + index * cardStep + cardWidth / 2 + cardBorderWidth - width / 2;

  const missionCardsScrollX = useRef(new Animated.Value(0)).current;
  const missionCardWidth = scaleW(270);
  const missionCardBorderWidth = 6;
  const missionCardMargin = scaleW(12);
  const missionCardGap = scaleW(12);
  const missionCardStep = missionCardWidth + missionCardMargin + missionCardGap;
  const missionCardsPaddingLeft = Math.max(0, (width - scaleW(48) - scaleW(280)) / 2);
  const getMissionCenterScrollX = (index: number) =>
    missionCardsPaddingLeft + index * missionCardStep + missionCardWidth / 2 + missionCardBorderWidth - width / 2;

  const springLessBouncy = { damping: 15, stiffness: 120 };
  const buttonSpring = { damping: 15, stiffness: 400 };
  const profileButtonScale = useSharedValue(1);
  const missionsButtonScale = useSharedValue(1);
  const navScale = useSharedValue(1);
  const bearCardTranslateX = useSharedValue(200);

  const profileButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: profileButtonScale.value }] }));
  const missionsButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: missionsButtonScale.value }] }));
  const navButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: navScale.value }] }));
  const bearCardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: bearCardTranslateX.value }] }));

  useEffect(() => {
    if (width > 0) {
      bearCardTranslateX.value = width;
      bearCardTranslateX.value = withDelay(100, withSpring(0, springLessBouncy));
    }
  }, [width]);

  useEffect(() => {
    const timer = setTimeout(() => {
      pagerRef.current?.scrollTo({ x: width * initialIndex, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [width, initialIndex]);

  const pageAnimatedStyles = useMemo(() => {
    if (width <= 0) return [];
    const w = width;
    const inactiveOpacity = 0;
    const inactiveOffset = 36;
    const fadeEdge = w * 0.25;
    return [
      {
        opacity: pagerX.interpolate({
          inputRange: [0, fadeEdge, w],
          outputRange: [1, 0.6, inactiveOpacity],
          extrapolate: "clamp",
        }),
        transform: [
          {
            translateY: pagerX.interpolate({
              inputRange: [0, w],
              outputRange: [0, inactiveOffset],
              extrapolate: "clamp",
            }),
          },
        ],
      },
      {
        opacity: pagerX.interpolate({
          inputRange: [0, w - fadeEdge, w, w + fadeEdge, w * 2],
          outputRange: [inactiveOpacity, 0.6, 1, 0.6, inactiveOpacity],
          extrapolate: "clamp",
        }),
        transform: [
          {
            translateY: pagerX.interpolate({
              inputRange: [0, w, w * 2],
              outputRange: [inactiveOffset, 0, inactiveOffset],
              extrapolate: "clamp",
            }),
          },
        ],
      },
      {
        opacity: pagerX.interpolate({
          inputRange: [w, w * 2 - fadeEdge, w * 2],
          outputRange: [inactiveOpacity, 0.6, 1],
          extrapolate: "clamp",
        }),
        transform: [
          {
            translateY: pagerX.interpolate({
              inputRange: [w, w * 2],
              outputRange: [inactiveOffset, 0],
              extrapolate: "clamp",
            }),
          },
        ],
      },
    ] as const;
  }, [width, pagerX]);

  const switchMode = (mode: HomeMode) => {
    const nextIndex = HOME_MODES.indexOf(mode);
    if (nextIndex < 0) return;

    pagerRef.current?.scrollTo({ x: width * nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, overflow: "hidden" as const },
        backgroundContainer: {
          position: "absolute" as const,
          width: width * 3,
          height,
          left: 0,
          top: 0,
        },
        backgroundImage: { width: width * 3, height },
        backgroundOverlay: {
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.1)",
        },
        contentContainer: { paddingBottom: scaleW(40) },
        pager: { flex: 1 },
        pagerContent: { width: width * HOME_MODES.length },
        pagerPage: { width, flex: 1 },
        creamButton: {
          backgroundColor: CREAM,
          width: scaleW(220),
          alignSelf: "center",
          borderRadius: scaleW(50),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(24),
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        bearsCard: {
          borderRadius: scaleW(15),
          marginBottom: scaleW(20),
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        bearImage: {
          position: "absolute",
          width: scaleW(140),
          height: scaleW(140),
          bottom: scaleW(-95),
        },
        horizontalCardsContainer: {
          paddingLeft: (width - scaleW(48) - scaleW(250)) / 2,
          paddingRight: scaleW(16),
          paddingBottom: scaleW(8),
          gap: scaleW(12),
        },
        clubCard: { width: scaleW(250), marginRight: scaleW(12) },
        clubCardImageWrap: {
          width: scaleW(250),
          height: scaleW(250),
          borderRadius: scaleW(16),
          overflow: "hidden" as const,
          backgroundColor: "#E0E0E0",
          borderWidth: 2,
          borderColor: "#FFF",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        clubCardImage: { width: "100%", height: "100%" },
        horizontalMissionCardsContainer: {
          paddingLeft: Math.max(0, (width - scaleW(48) - scaleW(280)) / 2),
          paddingRight: scaleW(16),
          paddingBottom: scaleW(8),
          gap: scaleW(12),
        },
      }),
    [scaleW, width, height]
  );

  const wrapNavPressable = (onPress: () => void, children: React.ReactNode) => (
    <AnimatedReanimated.View style={navButtonStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { navScale.value = withSpring(0.96, buttonSpring); }}
        onPressOut={() => { navScale.value = withSpring(1, buttonSpring); }}
        className="bg-white/90 rounded-full px-4 py-2 flex-row items-center"
      >
        {children}
      </Pressable>
    </AnimatedReanimated.View>
  );

  const renderNavigationButtons = () => {
    if (currentMode === "profile") {
      return (
        <View className="flex-row items-center justify-between px-6 pt-4">
          <ThemedText type="body" className="text-white font-jua opacity-90">
          </ThemedText>
          {wrapNavPressable(() => switchMode("activity"), (
            <>
              <ThemedText type="body" className="text-huntly-forest font-jua">
                Activity
              </ThemedText>
              <ThemedText className="text-huntly-forest ml-2 font-jua">→</ThemedText>
            </>
          ))}
        </View>
      );
    } else if (currentMode === "activity") {
      return (
        <View className="flex-row items-center justify-between px-6 pt-4">
          {wrapNavPressable(() => switchMode("profile"), (
            <>
              <ThemedText className="text-huntly-forest mr-2 font-jua">←</ThemedText>
              <ThemedText type="body" className="text-huntly-forest font-jua">
                Profile
              </ThemedText>
            </>
          ))}

          {wrapNavPressable(() => switchMode("missions"), (
            <>
              <ThemedText type="body" className="text-huntly-forest font-jua">
                Missions
              </ThemedText>
              <ThemedText className="text-huntly-forest ml-2 font-jua">→</ThemedText>
            </>
          ))}
        </View>
      );
    } else {
      return (
        <View className="flex-row items-center justify-between px-6 pt-4">
          {wrapNavPressable(() => switchMode("activity"), (
            <>
              <ThemedText className="text-huntly-forest mr-2 font-jua">←</ThemedText>
              <ThemedText type="body" className="text-huntly-forest font-jua">
                Activity
              </ThemedText>
            </>
          ))}
          <View style={{ width: scaleW(60) }} />
        </View>
      );
    }
  };

  const renderProfileContent = () => (
    <ScrollView
      className="flex-1"
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      <View style={{
        paddingHorizontal: scaleW(24),
        paddingTop: scaleW(120),
        paddingBottom: scaleW(24),
      }}>
        <ThemedText
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
          type="heading"
          className="text-white"
          style={{
              alignSelf: "center",
              maxWidth: scaleW(200),
              fontSize: scaleW(24),
              fontWeight: "600",
              textAlign: "center",
              marginTop: scaleW(48),
              marginBottom: scaleW(24),
              textShadowColor: "#000",
              textShadowRadius: 3,
              textShadowOffset: { width: 0, height: 0 },
            }}
        >
          Your stats
        </ThemedText>
        <View style={{
          flexDirection: "row",
          justifyContent: "center",
          marginBottom: scaleW(28),
          gap: scaleW(16),
          paddingHorizontal: scaleW(12),
        }}>
          <StatCard
            value={41}
            label="Days played"
            color="pink"
          />
          <StatCard
            value={139}
            label="Points Earned"
            color="green"
          />
        </View>

        <AnimatedReanimated.View style={profileButtonStyle}>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            onPressIn={() => { profileButtonScale.value = withSpring(0.96, buttonSpring); }}
            onPressOut={() => { profileButtonScale.value = withSpring(1, buttonSpring); }}
            style={[styles.creamButton]}
          >
            <ThemedText
              type="heading"
              style={{
                textAlign: "center",
                fontSize: scaleW(16),
                fontWeight: "600",
              }}
            >
              Your profile
            </ThemedText>
          </Pressable>
        </AnimatedReanimated.View>
      </View>
    </ScrollView>
  );

  const clubCards = [
    { id: "1", image: CLUB_1_IMAGE, title: "String it up", author: "Racing Mouse" },
    { id: "2", image: CLUB_2_IMAGE, title: "Into the green", author: "Tall Giant" },
    { id: "3", image: CLUB_1_IMAGE, title: "String it up", author: "Racing Mouse" },
  ];

  const renderActivityContent = () => (
    <ScrollView
      className="flex-1"
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      <View style={{
        paddingHorizontal: scaleW(24),
        paddingTop: scaleW(160),
        paddingBottom: scaleW(24),
      }}>
        <ThemedText
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
          type="heading"
          className="text-white"
          style={{
              alignSelf: "center",
              maxWidth: scaleW(200),
              fontSize: scaleW(24),
              fontWeight: "600",
              textAlign: "center",
              marginTop: scaleW(48),
              marginBottom: scaleW(24),
              textShadowColor: "#000",
              textShadowRadius: 3,
              textShadowOffset: { width: 0, height: 0 },
            }}
        >
          Welcome back, explorer!
        </ThemedText>

        <AnimatedReanimated.View style={bearCardStyle}>
          <View style={[styles.bearsCard, { backgroundColor: ORANGE_BANNER, borderWidth: 4, borderColor: "#FFF" }]}>
            <View className="flex-row items-center flex-1 overflow-hidden p-4">
              <View className="flex-1">
                <ThemedText type="heading" style={{ color: "#CE4008", fontSize: scaleW(20), fontWeight: "600", marginBottom: scaleW(16) }}>Bears</ThemedText>
                <ThemedText type="body" style={{ color: "#CE4008", fontSize: scaleW(18), width: scaleW(170), lineHeight: scaleW(20) }}>
                  We're doing great helping test the wind clues this week!
                </ThemedText>
              </View>
              <View style={{ width: scaleW(120) }}>
                <Image
                  source={BEAR_WAVE_IMAGE}
                  resizeMode="contain"
                  style={[styles.bearImage]}
                />
              </View>
            </View>
          </View>
        </AnimatedReanimated.View>

        <View
          style={{
            backgroundColor: "#BBE5EB",
            borderRadius: scaleW(15),
            paddingTop: scaleW(16),
            paddingBottom: scaleW(32),
            borderWidth: 4,
            borderColor: "#FFF",
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
            overflow: Platform.OS === "android" ? "visible" : undefined,
          }}
          collapsable={Platform.OS !== "android"}
        >
          <ThemedText type="heading" style={{ color: "#000", fontSize: scaleW(20), fontWeight: "600", marginBottom: scaleW(32), textAlign: "center" }}>
            From around the club
          </ThemedText>
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCardsContainer}
            style={{ overflow: "visible" }}
            nestedScrollEnabled={Platform.OS === "android"}
            removeClippedSubviews={false}
            overScrollMode="never"
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: clubCardsScrollX } } }],
              { useNativeDriver: true }
            )}
          >
            {clubCards.map((card, index) => {
              const centerScrollX = index === 0 ? 0 : getCenterScrollX(index);
              const rotation = clubCardsScrollX.interpolate({
                inputRange: [
                  centerScrollX - 120,
                  centerScrollX,
                  centerScrollX + 120,
                ],
                outputRange: ["-4deg", "0deg", "4deg"],
                extrapolate: "clamp",
              });
              return (
                <Animated.View
                  key={card.id}
                  style={[
                    styles.clubCard,
                    {
                      transform: [{ rotate: rotation }],
                    },
                  ]}
                >
                  <Pressable style={{ flex: 1 }}>
                    <View style={styles.clubCardImageWrap}>
                      <Image source={card.image} style={styles.clubCardImage} resizeMode="cover" />
                      <ThemedText type="heading" style={{
                        position: "absolute",
                        bottom: scaleW(40),
                        left: scaleW(10),
                        fontSize: scaleW(18),
                        textAlign: "center",
                        fontWeight: "600",
                        backgroundColor: "#FFF",
                        borderRadius: scaleW(20),
                        paddingHorizontal: scaleW(5),
                      }}>
                        {card.title}
                      </ThemedText>
                      <ThemedText type="heading" style={{
                        position: "absolute",
                        bottom: scaleW(10),
                        left: scaleW(10),
                        fontSize: scaleW(16),
                        textAlign: "center",
                        fontWeight: "600",
                        backgroundColor: "tomato",
                        color: "#FFF",
                        borderRadius: scaleW(20),
                        paddingHorizontal: scaleW(5),
                      }}>
                        by {card.author}
                      </ThemedText>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </Animated.ScrollView>
        </View>
      </View>
    </ScrollView>
  );

  const renderMissionsContent = () => (
    <ScrollView
      className="flex-1"
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      <View style={{ paddingHorizontal: scaleW(24), paddingTop: scaleW(8) }}>
        <ThemedText
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
          type="heading"
          className="text-white"
          style={{
              alignSelf: "center",
              fontSize: scaleW(24),
              fontWeight: "600",
              textAlign: "center",
              marginTop: scaleW(48),
              marginBottom: scaleW(24),
              textShadowColor: "#000",
              textShadowRadius: 3,
              textShadowOffset: { width: 0, height: 0 },
            }}
        >
          Your help is needed!
        </ThemedText>

        <View collapsable={Platform.OS !== "android"}>
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalMissionCardsContainer}
            style={{ overflow: "visible", marginBottom: scaleW(24) }}
            nestedScrollEnabled={Platform.OS === "android"}
            removeClippedSubviews={false}
            overScrollMode="never"
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: missionCardsScrollX } } }],
              { useNativeDriver: true }
            )}
          >
            {MISSION_CARDS.map((card, index) => {
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
                <Animated.View
                  key={card.id}
                  style={{
                    transform: [{ rotate: rotation }],
                  }}
                >
                  <MissionCard card={card} tiltDeg={0} />
                </Animated.View>
              );
            })}
          </Animated.ScrollView>
        </View>

        <AnimatedReanimated.View style={missionsButtonStyle}>
          <Pressable
            onPress={() => router.push("/(tabs)/missions")}
            onPressIn={() => { missionsButtonScale.value = withSpring(0.96, buttonSpring); }}
            onPressOut={() => { missionsButtonScale.value = withSpring(1, buttonSpring); }}
            style={styles.creamButton}
          >
            <ThemedText type="defaultSemiBold" className="text-huntly-forest text-center font-jua">
              See all missions
            </ThemedText>
          </Pressable>
        </AnimatedReanimated.View>
      </View>
    </ScrollView>
  );

  return (
    <View className="flex-1" style={styles.container}>
      <Animated.View
        style={[
          styles.backgroundContainer,
          {
            transform: [{ translateX: backgroundTranslateX }],
          },
        ]}
      >
        <ImageBackground
          source={BG_IMAGE}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.backgroundOverlay} />
        </ImageBackground>
      </Animated.View>

      <SafeAreaView edges={["top"]} className="flex-1">
        {renderNavigationButtons()}
        <Animated.ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          directionalLockEnabled
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: pagerX } } }],
            { useNativeDriver: true }
          )}
          onMomentumScrollEnd={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            const next = Math.round(x / width);
            setCurrentIndex(next);
          }}
          onScrollEndDrag={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            const next = Math.round(x / width);
            setCurrentIndex(next);
          }}
          style={styles.pager}
          contentContainerStyle={styles.pagerContent}
        >
          <Animated.View style={[styles.pagerPage, pageAnimatedStyles[0] ?? {}]}>
            {renderProfileContent()}
          </Animated.View>
          <Animated.View style={[styles.pagerPage, pageAnimatedStyles[1] ?? {}]}>
            {renderActivityContent()}
          </Animated.View>
          <Animated.View style={[styles.pagerPage, pageAnimatedStyles[2] ?? {}]}>
            {renderMissionsContent()}
          </Animated.View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}
