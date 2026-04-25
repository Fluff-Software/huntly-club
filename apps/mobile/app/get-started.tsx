import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Image,
  Pressable,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { router } from "expo-router";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const INTRO_SLIDES = [
  {
    id: "1",
    titleLine1: "Welcome to",
    titleLine2: "Huntly World",
    titleLine2Accent: true,
    body: "A place for adventures, learning, and exploring the world around you.",
    background: "#FCEACE",
    accentColor: "#E07B20",
    bgImage: require("@/assets/images/intro-step1-bg.png"),
    bgHeight: 420,
    characterImage: require("@/assets/images/bella-standing.png"),
    characterAlign: "left" as const,
  },
  {
    id: "2",
    titleLine1: "Your world",
    titleLine2: "to explore",
    titleLine2Accent: false,
    body: "Take on missions, earn badges, and discover new things as you grow.",
    background: "#9DD4FA",
    accentColor: "#3A7EC4",
    bgImage: require("@/assets/images/intro-step2-bg.png"),
    bgHeight: 420,
    characterImage: require("@/assets/images/felix-standing.png"),
    characterAlign: "center" as const,
  },
  {
    id: "3",
    titleLine1: "Exploring",
    titleLine2: "together",
    titleLine2Accent: false,
    body: "Join a team and celebrate progress with each other.",
    background: "#E6EBE1",
    accentColor: "#4A8040",
    bgImage: require("@/assets/images/intro-step3-bg.png"),
    bgHeight: 400,
    characterImage: require("@/assets/images/oli-standing.png"),
    characterAlign: "right" as const,
  },
];

const PAGINATION_ACTIVE = "#6B6B6B";
const PAGINATION_INACTIVE = "#C8C8C8";

export default function GetStartedScreen() {
  const { scaleW, width } = useLayoutScale();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(() => new Set([0]));

  const skipScale = useSharedValue(1);
  const continueScale = useSharedValue(1);
  const skipAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: skipScale.value }] }));
  const continueAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: continueScale.value }] }));

  const slideOpacity1 = useSharedValue(0);
  const slideTranslateY1 = useSharedValue(24);
  const slideOpacity2 = useSharedValue(0);
  const slideTranslateY2 = useSharedValue(24);
  const slide1Style = useAnimatedStyle(() => ({
    opacity: slideOpacity1.value,
    transform: [{ translateY: slideTranslateY1.value }],
  }));
  const slide2Style = useAnimatedStyle(() => ({
    opacity: slideOpacity2.value,
    transform: [{ translateY: slideTranslateY2.value }],
  }));

  useEffect(() => {
    if (visitedIndices.has(1)) {
      slideOpacity1.value = withSpring(1, { damping: 18, stiffness: 120 });
      slideTranslateY1.value = withSpring(0, { damping: 18, stiffness: 120 });
    }
    if (visitedIndices.has(2)) {
      slideOpacity2.value = withSpring(1, { damping: 18, stiffness: 120 });
      slideTranslateY2.value = withSpring(0, { damping: 18, stiffness: 120 });
    }
  }, [visitedIndices]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
    setVisitedIndices((prev) => (prev.has(index) ? prev : new Set([...prev, index])));
  };

  const goNext = () => {
    if (currentIndex < INTRO_SLIDES.length - 1) {
      flatListRef.current?.scrollToOffset({
        offset: (currentIndex + 1) * width,
        animated: true,
      });
    } else {
      router.replace("/sign-up");
    }
  };

  const skip = () => router.replace("/sign-up");

  const renderSlide = ({ item, index }: { item: (typeof INTRO_SLIDES)[0]; index: number }) => {
    const isLast = index === INTRO_SLIDES.length - 1;
    const slideContentStyle =
      index === 1 ? slide1Style : index === 2 ? slide2Style : undefined;

    const characterLeft =
      item.characterAlign === "left"
        ? scaleW(-20)
        : item.characterAlign === "right"
        ? undefined
        : undefined;
    const characterRight =
      item.characterAlign === "right"
        ? scaleW(-20)
        : undefined;
    const characterAlignSelf =
      item.characterAlign === "center" ? "center" : undefined;

    return (
      <View style={{ width, flex: 1, backgroundColor: item.background }}>
        <Animated.View
          entering={index === 0 ? FadeInDown.duration(500).delay(0) : undefined}
          style={[slideContentStyle, { flex: 1 }]}
        >
          {/* Background scene — bottom-anchored, full width */}
          <Image
            source={item.bgImage}
            // resizeMode="
            style={{
              position: "absolute",
              bottom: scaleW(90), // sits above the button bar
              left: 0,
              right: 0,
              height: scaleW(item.bgHeight),
              width: '100%',
            }}
          />

          {/* Character — sitting on the bg */}
          <Image
            source={item.characterImage}
            resizeMode="contain"
            style={{
              position: "absolute",
              bottom: scaleW(90),
              left: characterLeft,
              right: characterRight,
              alignSelf: characterAlignSelf,
              width: scaleW(280),
              height: scaleW(380),
            }}
          />

          {/* Top content */}
          <View style={{ paddingHorizontal: scaleW(24), paddingTop: scaleW(16) }}>
            {/* Dots */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: scaleW(32) }}>
              {INTRO_SLIDES.map((_, i) => (
                <React.Fragment key={i}>
                  <View
                    style={{
                      width: scaleW(10),
                      height: scaleW(10),
                      borderRadius: scaleW(5),
                      backgroundColor: i === index ? PAGINATION_ACTIVE : PAGINATION_INACTIVE,
                    }}
                  />
                  {i < INTRO_SLIDES.length - 1 && (
                    <View
                      style={{
                        width: scaleW(24),
                        height: scaleW(2),
                        backgroundColor: i < index ? PAGINATION_ACTIVE : PAGINATION_INACTIVE,
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>

            {/* Title */}
            <ThemedText
              type="heading"
              lightColor="#3B2A1A"
              darkColor="#3B2A1A"
              style={{ textAlign: "center", fontSize: scaleW(32), fontWeight: "800", lineHeight: scaleW(38) }}
            >
              {item.titleLine1}{"\n"}
              {item.titleLine2Accent ? (
                <ThemedText
                  type="heading"
                  lightColor={item.accentColor}
                  darkColor={item.accentColor}
                  style={{ fontSize: scaleW(32), fontWeight: "800" }}
                >
                  {item.titleLine2}
                </ThemedText>
              ) : item.titleLine2}
            </ThemedText>

            {/* Body */}
            <ThemedText
              lightColor="#3B2A1A"
              darkColor="#3B2A1A"
              style={{
                textAlign: "center",
                marginTop: scaleW(16),
                paddingHorizontal: scaleW(16),
                fontSize: scaleW(16),
                lineHeight: scaleW(24),
                opacity: 0.85,
              }}
            >
              {item.body}
            </ThemedText>
          </View>

          {/* Bottom button bar */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "#FFFFFF",
              paddingHorizontal: scaleW(24),
              paddingVertical: scaleW(20),
              flexDirection: "row",
              gap: scaleW(12),
            }}
          >
            <Animated.View style={[{ flex: 1 }, skipAnimatedStyle]}>
              <Pressable
                onPress={skip}
                onPressIn={() => { skipScale.value = withSpring(0.96, { damping: 15, stiffness: 400 }); }}
                onPressOut={() => { skipScale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
                style={{
                  paddingVertical: scaleW(16),
                  borderRadius: scaleW(50),
                  borderWidth: 2,
                  borderColor: item.accentColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ThemedText
                  type="heading"
                  lightColor={item.accentColor}
                  darkColor={item.accentColor}
                  style={{ fontSize: scaleW(16), fontWeight: "600" }}
                >
                  Skip
                </ThemedText>
              </Pressable>
            </Animated.View>

            <Animated.View style={[{ flex: 1 }, continueAnimatedStyle]}>
              <Pressable
                onPress={goNext}
                onPressIn={() => { continueScale.value = withSpring(0.96, { damping: 15, stiffness: 400 }); }}
                onPressOut={() => { continueScale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
                style={{
                  paddingVertical: scaleW(16),
                  borderRadius: scaleW(50),
                  backgroundColor: item.accentColor,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <ThemedText
                  type="heading"
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                  style={{ fontSize: scaleW(16), fontWeight: "600" }}
                >
                  {isLast ? "Let's go!" : "Continue"}
                </ThemedText>
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        ref={flatListRef}
        data={INTRO_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
    </SafeAreaView>
  );
}
