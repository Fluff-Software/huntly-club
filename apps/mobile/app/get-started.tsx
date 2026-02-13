import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Image,
  Pressable,
  FlatList,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedReanimated, {
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

const HUNTLY_GREEN = "#4F6F52";
const PAGINATION_ACTIVE = "#4D7653";
const PAGINATION_INACTIVE = "#FFFFFF";

const INTRO_SLIDES = [
  {
    id: "1",
    title: "Welcome to Huntly World",
    body: "A place for adventures, learning, and exploring the world around you.",
    background: "#EBCDBB",
    graphic: "bear",
  },
  {
    id: "2",
    title: "This is your world to explore.",
    body: "Go on missions. Discover new things. Earn badges as you learn and grow.",
    background: "#BBDCEB",
    graphic: "icons",
  },
  {
    id: "3",
    title: "Exploring together",
    body: "Join a team and take on adventures alongside other explorers.",
    body2: "See what your team is up to, celebrate progress, and work towards shared goals.",
    background: "#EBEBBB",
    graphic: "mountain",
  },
];

export default function GetStartedScreen() {
  const { scaleW, width } = useLayoutScale();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(() => new Set([0]));
  const bearSlideAnim = useRef(new Animated.Value(400)).current;

  const skipScale = useSharedValue(1);
  const continueScale = useSharedValue(1);
  const letsGoScale = useSharedValue(1);
  const skipAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: skipScale.value }] }));
  const continueAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: continueScale.value }] }));
  const letsGoAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: letsGoScale.value }] }));

  const opacitySlide1 = useSharedValue(0);
  const opacitySlide2 = useSharedValue(0);
  const translateYSlide1 = useSharedValue(24);
  const translateYSlide2 = useSharedValue(24);
  const slide1ContentStyle = useAnimatedStyle(() => ({
    opacity: opacitySlide1.value,
    transform: [{ translateY: translateYSlide1.value }],
  }));
  const slide2ContentStyle = useAnimatedStyle(() => ({
    opacity: opacitySlide2.value,
    transform: [{ translateY: translateYSlide2.value }],
  }));

  useEffect(() => {
    if (width === 0) return;
    bearSlideAnim.setValue(width);
    Animated.spring(bearSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 45,
      friction: 8,
    }).start();
  }, [width]);

  useEffect(() => {
    if (visitedIndices.has(1)) {
      opacitySlide1.value = withSpring(1, { damping: 18, stiffness: 120 });
      translateYSlide1.value = withSpring(0, { damping: 18, stiffness: 120 });
    }
    if (visitedIndices.has(2)) {
      opacitySlide2.value = withSpring(1, { damping: 18, stiffness: 120 });
      translateYSlide2.value = withSpring(0, { damping: 18, stiffness: 120 });
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

  const skip = () => {
    router.replace("/sign-up");
  };

  const renderSlide = ({ item, index }: { item: (typeof INTRO_SLIDES)[0]; index: number }) => {
    const isLast = index === INTRO_SLIDES.length - 1;
    const isFirstSlide = index === 0;
    const slideContentStyle =
      index === 1 ? slide1ContentStyle : index === 2 ? slide2ContentStyle : undefined;
    return (
      <View style={{ width, flex: 1, backgroundColor: item.background, paddingHorizontal: scaleW(24) }}>
        <AnimatedReanimated.View
          entering={isFirstSlide ? FadeInDown.duration(500).delay(0).springify().damping(18) : undefined}
          style={[slideContentStyle, { flex: 1 }]}
        >
        {/* Pagination: dots connected by lines */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: scaleW(80),
          }}
        >
          {INTRO_SLIDES.map((_, i) => (
            <React.Fragment key={i}>
              <View
                style={{
                  width: scaleW(24),
                  height: scaleW(24),
                  borderRadius: scaleW(12),
                  backgroundColor: i <= index ? PAGINATION_ACTIVE : PAGINATION_INACTIVE,
                  borderWidth: scaleW(5),
                  borderColor: PAGINATION_INACTIVE,
                }}
              />
              {i < INTRO_SLIDES.length - 1 && (
                <View
                  style={{
                    width: scaleW(16),
                    height: scaleW(10),
                    backgroundColor: PAGINATION_INACTIVE,
                    marginHorizontal: scaleW(-1),
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Title & body */}
        <ThemedText
          type="heading"
          lightColor="#36454F"
          darkColor="#36454F"
          style={{ textAlign: "center", marginTop: scaleW(40), fontWeight: 600, fontSize: scaleW(20) }}
        >
          {item.title}
        </ThemedText>
        <ThemedText
          lightColor="#36454F"
          darkColor="#36454F"
          style={{ textAlign: "center", marginTop: scaleW(40), paddingHorizontal: scaleW(32), fontSize: scaleW(18) }}
        >
          {item.body}
        </ThemedText>
        {"body2" in item && item.body2 && (
          <ThemedText
            lightColor="#36454F"
            darkColor="#36454F"
            style={{ textAlign: "center", marginTop: scaleW(16), paddingHorizontal: scaleW(32), fontSize: scaleW(18) }}
          >
            {item.body2}
          </ThemedText>
        )}

        {/* Graphic */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: scaleW(24) }}>
          {item.graphic === "bear" && (
            <Animated.View
              style={{
                position: "absolute",
                bottom: scaleW(-125),
                right: scaleW(-80),
                transform: [{ translateX: bearSlideAnim }],
              }}
            >
              <Image
                source={require("@/assets/images/bear-wave.png")}
                resizeMode="contain"
                style={{ width: scaleW(350), height: scaleW(350) }}
              />
            </Animated.View>
          )}
          {item.graphic === "icons" && (
            <View style={{ position: "absolute", flexDirection: "row", alignItems: "center", top: scaleW(20) }}>
              <Image
                source={require("@/assets/images/get-started-icon-1.png")}
                resizeMode="contain"
                style={{ width: scaleW(120), height: scaleW(120), marginTop: scaleW(140) }}
              />
              <Image
                source={require("@/assets/images/get-started-icon-2.png")}
                resizeMode="contain"
                style={{ width: scaleW(100), height: scaleW(100), marginTop: scaleW(-20) }}
              />
            </View>
          )}
          {item.graphic === "mountain" && (
            <Image
              source={require("@/assets/images/get-started-icon-3.png")}
              resizeMode="contain"
              style={{ position: "absolute", bottom: scaleW(-55), width: scaleW(330), height: scaleW(330) }}
            />
          )}
        </View>

        {/* Buttons */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            marginHorizontal: scaleW(-24),
            paddingHorizontal: scaleW(24),
            paddingVertical: scaleW(60),
            gap: scaleW(12),
          }}
        >
          {!isLast ? (
            <>
              <View style={{ flexDirection: "row", gap: scaleW(24), paddingHorizontal: scaleW(36) }}>
                <AnimatedReanimated.View style={[{ flex: 1 }, skipAnimatedStyle]}>
                  <Pressable
                    onPress={skip}
                    onPressIn={() => {
                      skipScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
                    }}
                    onPressOut={() => {
                      skipScale.value = withSpring(1, { damping: 15, stiffness: 400 });
                    }}
                    style={{
                      paddingVertical: scaleW(16),
                      borderRadius: scaleW(50),
                      backgroundColor: HUNTLY_GREEN,
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.5,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  >
                    <ThemedText type="heading" lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ fontSize: scaleW(16), fontWeight: "600" }}>
                      Skip
                    </ThemedText>
                  </Pressable>
                </AnimatedReanimated.View>
                <AnimatedReanimated.View style={[{ flex: 1 }, continueAnimatedStyle]}>
                  <Pressable
                    onPress={goNext}
                    onPressIn={() => {
                      continueScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
                    }}
                    onPressOut={() => {
                      continueScale.value = withSpring(1, { damping: 15, stiffness: 400 });
                    }}
                    style={{
                      paddingVertical: scaleW(16),
                      borderRadius: scaleW(50),
                      backgroundColor: HUNTLY_GREEN,
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.5,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  >
                    <ThemedText type="heading" lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ fontSize: scaleW(16), fontWeight: "600" }}>
                      Continue
                    </ThemedText>
                  </Pressable>
                </AnimatedReanimated.View>
              </View>
            </>
          ) : (
            <AnimatedReanimated.View style={letsGoAnimatedStyle}>
              <Pressable
                onPress={goNext}
                onPressIn={() => {
                  letsGoScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
                }}
                onPressOut={() => {
                  letsGoScale.value = withSpring(1, { damping: 15, stiffness: 400 });
                }}
                style={{
                  marginHorizontal: scaleW(40),
                  paddingVertical: scaleW(16),
                  borderRadius: scaleW(50),
                  backgroundColor: HUNTLY_GREEN,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.5,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <ThemedText type="heading" lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ fontSize: scaleW(18), fontWeight: "600" }}>
                  Let's go!
                </ThemedText>
              </Pressable>
            </AnimatedReanimated.View>
          )}
        </View>
        </AnimatedReanimated.View>
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
