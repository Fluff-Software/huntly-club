import React, { useRef, useState } from "react";
import {
  View,
  Image,
  Pressable,
  FlatList,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { router } from "expo-router";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ThemedText } from "@/components/ThemedText";

const HUNTLY_GREEN = "#4F6F52";
const PAGINATION_ACTIVE = "#4D7653";
const PAGINATION_INACTIVE = "#FFFFFF";

/** Reference design size (logical pts). Scale layout from this to current window (logical pixels). */
const REFERENCE_WIDTH = 390;
const REFERENCE_HEIGHT = 844;

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
  const { width, height } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Scale from reference design (logical pts) to current window logical pixels
  const scaleW = (n: number) => Math.round((width / REFERENCE_WIDTH) * n);
  const scaleH = (n: number) => Math.round((height / REFERENCE_HEIGHT) * n);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const goNext = () => {
    if (currentIndex < INTRO_SLIDES.length - 1) {
      flatListRef.current?.scrollToOffset({
        offset: (currentIndex + 1) * width,
        animated: true,
      });
    } else {
      router.replace({ pathname: "/auth", params: { mode: "signup" } });
    }
  };

  const skip = () => {
    router.replace({ pathname: "/auth", params: { mode: "signup" } });
  };

  const renderSlide = ({ item, index }: { item: (typeof INTRO_SLIDES)[0]; index: number }) => {
    const isLast = index === INTRO_SLIDES.length - 1;
    return (
      <View style={{ width, height, backgroundColor: item.background, paddingHorizontal: scaleW(24) }}>
        {/* Pagination: dots connected by lines */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: scaleH(80),
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
          style={{ textAlign: "center", marginTop: scaleH(40), fontWeight: 600, fontSize: scaleW(20) }}
        >
          {item.title}
        </ThemedText>
        <ThemedText
          lightColor="#36454F"
          darkColor="#36454F"
          style={{ textAlign: "center", marginTop: scaleH(40), paddingHorizontal: scaleW(32), fontSize: scaleW(18) }}
        >
          {item.body}
        </ThemedText>
        {"body2" in item && item.body2 && (
          <ThemedText
            lightColor="#36454F"
            darkColor="#36454F"
            style={{ textAlign: "center", marginTop: scaleH(16), paddingHorizontal: scaleW(32), fontSize: scaleW(18) }}
          >
            {item.body2}
          </ThemedText>
        )}

        {/* Graphic */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: scaleH(24) }}>
          {item.graphic === "bear" && (
            <Image
              source={require("@/assets/images/bear-wave.png")}
              resizeMode="contain"
              style={{ position: "absolute", bottom: scaleH(-125), right: scaleW(-80), width: scaleW(350), height: scaleH(350) }}
            />
          )}
          {item.graphic === "icons" && (
            <View style={{ position: "absolute", flexDirection: "row", alignItems: "center", top: scaleW(20) }}>
              <Image
                source={require("@/assets/images/get-started-icon-1.png")}
                resizeMode="contain"
                style={{ width: scaleW(120), height: scaleW(120), marginTop: scaleW(80) }}
              />
              <Image
                source={require("@/assets/images/get-started-icon-2.png")}
                resizeMode="contain"
                style={{ width: scaleW(100), height: scaleW(100), marginTop: scaleW(-80) }}
              />
            </View>
          )}
          {item.graphic === "mountain" && (
            <Image
              source={require("@/assets/images/get-started-icon-3.png")}
              resizeMode="contain"
              style={{ position: "absolute", bottom: scaleH(-55), width: scaleW(330), height: scaleH(330) }}
            />
          )}
        </View>

        {/* Buttons */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            marginHorizontal: scaleW(-24),
            paddingHorizontal: scaleW(24),
            paddingVertical: scaleH(60),
            gap: scaleH(12),
          }}
        >
          {!isLast ? (
            <>
              <View style={{ flexDirection: "row", gap: scaleW(24), paddingHorizontal: scaleW(36) }}>
                <Pressable
                  onPress={skip}
                  style={{
                    flex: 1,
                    paddingVertical: scaleH(16),
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
                <Pressable
                  onPress={goNext}
                  style={{
                    flex: 1,
                    paddingVertical: scaleH(16),
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
              </View>
            </>
          ) : (
            <Pressable
              onPress={goNext}
              style={{
                marginHorizontal: scaleW(40),
                paddingVertical: scaleH(16),
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
          )}
        </View>
      </View>
    );
  };

  return (
    <>
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
    </>
  );
}
