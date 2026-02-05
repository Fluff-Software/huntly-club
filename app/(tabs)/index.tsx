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
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";

type HomeMode = "profile" | "activity" | "missions";
const HOME_MODES: HomeMode[] = ["profile", "activity", "missions"];

const BG_IMAGE = require("@/assets/images/bg.png");
const BEAR_WAVE_IMAGE = require("@/assets/images/bear-wave.png");
const LASER_FORTRESS_IMAGE = require("@/assets/images/laser-fortress.jpg");
const WHISPERING_WIND_IMAGE = require("@/assets/images/whispering-wind.png");

const CARD_PINK = "#FFB5B5";
const CARD_GREEN = "#B5FFCE";
const CREAM = "#F4F0EB";
const ORANGE_BANNER = "#EBCDBB";

export default function HomeScreen() {
  const { scaleW, scaleH, width, height } = useLayoutScale();
  const initialIndex = 1; // activity (Welcome back)
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const currentMode = HOME_MODES[currentIndex] ?? "activity";

  const pagerRef = useRef<ScrollView>(null);
  const pagerX = useRef(new Animated.Value(width * initialIndex)).current;
  const backgroundTranslateX = Animated.multiply(pagerX, -1);

  useEffect(() => {
    const timer = setTimeout(() => {
      pagerRef.current?.scrollTo({ x: width * initialIndex, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [width, initialIndex]);

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
        contentContainer: { paddingBottom: scaleH(40) },
        pager: { flex: 1 },
        pagerContent: { width: width * HOME_MODES.length },
        pagerPage: { width, flex: 1 },
        statCard: {
          flex: 1,
          borderRadius: scaleW(20),
          paddingVertical: scaleW(32),
          paddingHorizontal: scaleW(16),
          alignItems: "center",
          justifyContent: "center",
        },
        statCardHeading: {
          fontSize: scaleW(44),
          lineHeight: scaleW(52),
          fontWeight: "600",
          color: "#000",
          marginBottom: scaleW(24),
        },
        statCardBody: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: "#000",
        },
        creamButton: {
          backgroundColor: CREAM,
          width: scaleW(220),
          alignSelf: "center",
          borderRadius: scaleW(50),
          paddingVertical: scaleH(16),
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
          marginBottom: scaleH(20),
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
        missionCardSwipeable: {
          width: scaleW(280),
          marginRight: scaleW(12),
        },
        missionCardInner: {
          width: "100%",
          backgroundColor: "#FFF",
          borderRadius: scaleW(28),
          padding: scaleW(12),
          borderWidth: 6,
          borderColor: "#7FAF8A",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        missionCardImageWrap: {
          width: "100%",
          height: scaleW(160),
          borderRadius: scaleW(16),
          overflow: "hidden",
          marginBottom: scaleH(12),
          backgroundColor: "#1a1a2e",
        },
        missionCardImage: { width: "100%", height: "100%" },
        horizontalMissionCardsContainer: {
          paddingLeft: Math.max(0, (width - scaleW(48) - scaleW(280)) / 2),
          paddingRight: scaleW(16),
          paddingBottom: scaleW(8),
          gap: scaleW(12),
        },
        startButton: {
          backgroundColor: "#7FAF8A",
          borderRadius: scaleW(32),
          paddingVertical: scaleH(12),
          marginHorizontal: scaleW(12),
          marginBottom: scaleH(6),
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
      }),
    [scaleW, scaleH, width, height]
  );

  const renderNavigationButtons = () => {
    if (currentMode === "profile") {
      return (
        <View className="flex-row items-center justify-between px-6 pt-4">
          <ThemedText type="body" className="text-white font-jua opacity-90">
            Home
          </ThemedText>
          <Pressable
            onPress={() => switchMode("activity")}
            className="bg-white/90 rounded-full px-4 py-2 flex-row items-center"
          >
            <ThemedText type="body" className="text-huntly-forest font-jua">
              Activity
            </ThemedText>
            <ThemedText className="text-huntly-forest ml-2 font-jua">→</ThemedText>
          </Pressable>
        </View>
      );
    } else if (currentMode === "activity") {
      return (
        <View className="flex-row items-center justify-between px-6 pt-4">
          <Pressable
            onPress={() => switchMode("profile")}
            className="bg-white/90 rounded-full px-4 py-2 flex-row items-center"
          >
            <ThemedText className="text-huntly-forest mr-2 font-jua">←</ThemedText>
            <ThemedText type="body" className="text-huntly-forest font-jua">
              Profile
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => switchMode("missions")}
            className="bg-white/90 rounded-full px-4 py-2 flex-row items-center"
          >
            <ThemedText type="body" className="text-huntly-forest font-jua">
              Missions
            </ThemedText>
            <ThemedText className="text-huntly-forest ml-2 font-jua">→</ThemedText>
          </Pressable>
        </View>
      );
    } else {
      return (
        <View className="flex-row items-center justify-between px-6 pt-4">
          <Pressable
            onPress={() => switchMode("activity")}
            className="bg-white/90 rounded-full px-4 py-2 flex-row items-center"
          >
            <ThemedText className="text-huntly-forest mr-2 font-jua">←</ThemedText>
            <ThemedText type="body" className="text-huntly-forest font-jua">
              Activity
            </ThemedText>
          </Pressable>
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
        paddingTop: scaleH(120),
        paddingBottom: scaleH(24),
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
              marginTop: scaleH(48),
              marginBottom: scaleH(24),
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
          <View style={[styles.statCard, { backgroundColor: CARD_PINK }]}>
            <ThemedText
              type="heading"
              style={styles.statCardHeading}>
              41
            </ThemedText>
            <ThemedText
              type="heading"
              style={styles.statCardBody}>
              Days played
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: CARD_GREEN }]}>
            <ThemedText
              type="heading"
              style={styles.statCardHeading}>
              139
            </ThemedText>
            <ThemedText
              type="heading"
              style={styles.statCardBody}>
              Points Earned
            </ThemedText>
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
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
      </View>
    </ScrollView>
  );

  const clubCards = [
    { id: "1", image: WHISPERING_WIND_IMAGE, title: "String it up", author: "Racing Mouse" },
    { id: "2", image: LASER_FORTRESS_IMAGE, title: "Into the maze", author: "Tal" },
  ];

  const missionCards = [
    {
      id: "1",
      image: LASER_FORTRESS_IMAGE,
      title: "Build a Laser Maze",
      description: "Create a laser maze using string, wool or tape. Rules are up to you: time limit, penalties, silent mode.",
    },
    {
      id: "2",
      image: LASER_FORTRESS_IMAGE,
      title: "Build a Laser Maze",
      description: "Create a laser maze using string, wool or tape. Rules are up to you: time limit, penalties, silent mode.",
    },
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
        paddingTop: scaleH(160),
        paddingBottom: scaleH(24),
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
              marginTop: scaleH(48),
              marginBottom: scaleH(24),
              textShadowColor: "#000",
              textShadowRadius: 3,
              textShadowOffset: { width: 0, height: 0 },
            }}
        >
          Welcome back, explorer!
        </ThemedText>

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

        <View style={{
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
        }}>
          <ThemedText type="heading" style={{ color: "#000", fontSize: scaleW(20), fontWeight: "600", marginBottom: scaleW(32), textAlign: "center" }}>
            From around the club
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCardsContainer}
            style={{ overflow: "visible" }}
            nestedScrollEnabled={Platform.OS === "android"}
          >
            {clubCards.map((card, index) => (
              <Pressable
                key={card.id}
                style={[
                  styles.clubCard,
                  {
                    transform: [{ rotate: index % 2 === 0 ? "-2deg" : "2deg" }],
                    marginTop: index % 2 === 0 ? scaleW(-5) : scaleW(5),
                  },
                ]}
              >
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
            ))}
          </ScrollView>
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
      <View style={{ paddingHorizontal: scaleW(24), paddingTop: scaleH(8) }}>
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
              marginTop: scaleH(48),
              marginBottom: scaleH(24),
              textShadowColor: "#000",
              textShadowRadius: 3,
              textShadowOffset: { width: 0, height: 0 },
            }}
        >
          Your help is needed!
        </ThemedText>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalMissionCardsContainer}
          style={{ overflow: "visible", marginBottom: scaleH(24) }}
          nestedScrollEnabled={Platform.OS === "android"}
        >
          {missionCards.map((card, index) => (
            <Pressable
              key={card.id}
              style={[
                styles.missionCardSwipeable,
                {
                  transform: [{ rotate: index % 2 === 0 ? "-0.5deg" : "0.5deg" }],
                  marginTop: index % 2 === 0 ? scaleW(-2) : scaleW(2),
                },
              ]}
            >
              <View style={styles.missionCardInner}>
                <View style={styles.missionCardImageWrap}>
                  <Image source={card.image} style={styles.missionCardImage} resizeMode="cover" />
                </View>
                <ThemedText
                  type="heading"
                  style={{
                    fontSize: scaleW(18),
                    fontWeight: "600",
                    marginBottom: scaleW(16),
                    textAlign: "center",
                    color: "#000",
                  }}
                >
                  {card.title}
                </ThemedText>
                <ThemedText
                  type="body"
                  style={{
                    fontSize: scaleW(16),
                    fontWeight: "400",
                    marginBottom: scaleW(24),
                    textAlign: "center",
                    color: "#000",
                  }}
                >
                  {card.description}
                </ThemedText>
                <Pressable
                  onPress={() => router.push("/pack" as Parameters<typeof router.push>[0])}
                  style={styles.startButton}
                >
                  <ThemedText
                    type="heading"
                    style={{
                      fontSize: scaleW(16),
                      fontWeight: "600",
                      textAlign: "center",
                      color: "#FFF",
                    }}
                  >
                    Start
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          onPress={() => router.push("/pack" as Parameters<typeof router.push>[0])}
          style={styles.creamButton}
        >
          <ThemedText type="defaultSemiBold" className="text-huntly-forest text-center font-jua">
            See all missions
          </ThemedText>
        </Pressable>
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
          <View style={styles.pagerPage}>{renderProfileContent()}</View>
          <View style={styles.pagerPage}>{renderActivityContent()}</View>
          <View style={styles.pagerPage}>{renderMissionsContent()}</View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}
