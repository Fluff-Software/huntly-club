import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useLayoutScale } from "@/hooks/useLayoutScale";

const HUNTLY_GREEN = "#4F6F52";

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

export default function SignUpIntroScreen() {
  const { scaleW, width, height } = useLayoutScale();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

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
      router.replace({ pathname: "/auth", params: { mode: "signup" } });
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
      return (
        <View style={{ width, flex: 1, backgroundColor: "#FFFFFF" }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: scaleW(36),
              paddingTop: scaleW(48),
              paddingBottom: scaleW(48),
            }}
            showsVerticalScrollIndicator={true}
          >
          <Text
            style={{
              color: "#1F2937",
              textAlign: "center",
              fontWeight: "700",
              fontSize: scaleW(18),
              marginBottom: scaleW(8),
            }}
          >
            This latest season is here!
          </Text>
          <Text
            style={{
              color: "#4B5563",
              textAlign: "center",
              fontSize: scaleW(16),
              marginBottom: scaleW(24),
            }}
          >
            Your new season is ready to view
          </Text>
          <Text
            style={{
              color: "#1F2937",
              textAlign: "center",
              fontWeight: "400",
              fontSize: scaleW(30),
              marginBottom: scaleW(24),
            }}
          >
            The Secret of the Whispering Wind.
          </Text>
          <View
            style={{
              alignSelf: "center",
              width: scaleW(280),
              height: scaleW(280),
              borderRadius: scaleW(140),
              overflow: "hidden",
              marginBottom: scaleW(28),
            }}
          >
            <Image
              source={require("@/assets/images/whispering-wind.png")}
              resizeMode="cover"
              style={{ width: "100%", height: "100%" }}
            />
          </View>
          <Text
            style={{
              color: "#374151",
              alignSelf: "center",
              fontSize: scaleW(18),
              lineHeight: scaleW(24),
              marginBottom: scaleW(16),
              textAlign: "center",
            }}
          >
            A mysterious warm breeze is sweeping the land, whispering clues
            about a hidden treasure buried long ago by the Guardians of Nature.
          </Text>
          <Text
            style={{
              color: "#374151",
              alignSelf: "center",
              fontSize: scaleW(18),
              lineHeight: scaleW(24),
              marginBottom: scaleW(16),
              textAlign: "center",
            }}
          >
            But the wind speaks only in puzzles, riddles, and signs.
          </Text>
          <Text
            style={{
              color: "#374151",
              alignSelf: "center",
              fontSize: scaleW(18),
              lineHeight: scaleW(24),
              marginBottom: scaleW(32),
              textAlign: "center",
            }}
          >
            The three teams must work together (and compete!) to solve the
            mystery, uncover the clues, and protect the natural world.
          </Text>
          <Pressable
            onPress={goNext}
            style={{
              alignSelf: "center",
              width: "100%",
              paddingVertical: scaleW(16),
              borderRadius: scaleW(50),
              backgroundColor: HUNTLY_GREEN,
              alignItems: "center",
              justifyContent: "center",
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
          </ScrollView>
        </View>
      );
    }

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
            source={require("@/assets/images/whispering-wind.png")}
            resizeMode="contain"
            style={{ width: "50%", height: "50%", marginTop: width * 1.6, alignSelf: "center" }}
          />
        </View>
        <Text
          style={{
            color: "#1F2937",
            textAlign: "center",
            fontWeight: "400",
            fontSize: scaleW(30),
            marginBottom: scaleW(24),
          }}
        >
          The Secret of the Whispering Wind
        </Text>
        <View style={{ marginBottom: scaleW(56) }}>
          <View
            style={{
              position: "absolute",
              top: scaleW(5),
              width: width * 0.9,
              height: height * 0.44,
              backgroundColor: "#6AE6AE",
              borderRadius: scaleW(20),
              padding: scaleW(15),
              marginBottom: scaleW(24),
              borderWidth: 4,
              borderColor: "#FFF",
              transform: [{ rotate: "3deg" }],
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
              overflow: "hidden",
            }}
          />
          <View
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
              >
                Build a laser fortress
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
                  50 Points
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
                source={require("@/assets/images/laser-fortress.jpg")}
                resizeMode="cover"
                style={{ width: "100%", height: "100%" }}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: scaleW(8),
                marginBottom: scaleW(12),
                justifyContent: "center",
              }}
            >
              <View
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
                <Text
                  style={{
                    color: "#374151",
                    fontSize: scaleW(13),
                  }}
                >
                  Nature
                </Text>
              </View>
              <View
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
                <Text
                  style={{
                    color: "#374151",
                    fontSize: scaleW(13),
                  }}
                >
                  Building
                </Text>
              </View>
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
            >
              Set up a strong defence to help keep the gem safe.
            </Text>
          </View>
        </View>
        <Pressable
          onPress={goNext}
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
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: scaleW(16),
              fontWeight: "600",
            }}
          >
            Dashboard
          </Text>
        </Pressable>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ title: "Welcome", headerShown: false }} />
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
  );
}
