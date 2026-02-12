import React, { useMemo, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { supabase } from "@/services/supabase";

const WHISPERING_WIND_IMAGE = require("@/assets/images/whispering-wind.png");

type FirstSeason = { name: string | null; hero_image: string | null } | null;

const STORY_BLUE = "#4B9CD2";
const CREAM = "#F4F0EB";
const DARK_GREEN = "#2D5A27";

export default function StoryScreen() {
  const { scaleW, width } = useLayoutScale();
  const creamButtonScale = useSharedValue(1);
  const completeButtonScale = useSharedValue(1);
  const [firstSeason, setFirstSeason] = useState<FirstSeason>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("seasons")
        .select("name, hero_image")
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();
      setFirstSeason(data ?? null);
    })();
  }, []);

  const creamButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: creamButtonScale.value }],
  }));
  const completeButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completeButtonScale.value }],
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: STORY_BLUE },
        scrollContent: {
          flexGrow: 1,
          paddingTop: scaleW(24),
        },
        seasonContainer: {
          backgroundColor: STORY_BLUE,
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
          zIndex: 1,
        },
        imageCircleWrap: {
          width: width * 2.5,
          height: width * 2.5,
          borderRadius: (width * 2.5) / 2,
          overflow: "hidden",
          marginBottom: scaleW(20),
          alignSelf: "center",
          marginTop: -width * 2.1,
        },
        imageCircleImage: {
          width: "50%",
          height: "50%",
          marginTop: width * 1.6,
          alignSelf: "center",
        },
        seasonLabel: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: "#FFF",
          textAlign: "center",
          marginBottom: scaleW(16),
          opacity: 0.95,
        },
        seasonTitle: {
          fontSize: scaleW(32),
          lineHeight: scaleW(40),
          fontWeight: "600",
          color: "#FFF",
          textAlign: "center",
          marginBottom: scaleW(16),
        },
        creamButton: {
          backgroundColor: CREAM,
          alignSelf: "center",
          borderRadius: scaleW(28),
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(32),
          alignItems: "center",
          justifyContent: "center",
          marginBottom: scaleW(40),
        },
        chapterContainer: {
          backgroundColor: "#438DBD",
          paddingVertical: scaleW(48),
          paddingHorizontal: scaleW(36),
        },
        chapterTitle: {
          fontSize: scaleW(20),
          fontWeight: "600",
          color: "#FFF",
          marginBottom: scaleW(4),
        },
        releaseDate: {
          fontSize: scaleW(13),
          color: "rgba(255,255,255,0.7)",
          marginBottom: scaleW(16),
        },
        bodyText: {
          fontSize: scaleW(16),
          color: "#FFF",
          lineHeight: scaleW(24),
          marginBottom: scaleW(12),
        },
        completeButton: {
          backgroundColor: "#7FAF8A",
          alignSelf: "flex-start",
          borderRadius: scaleW(28),
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(24),
          alignItems: "center",
          justifyContent: "center",
          marginTop: scaleW(24),
          marginBottom: scaleW(48),
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        nextLabel: {
          fontSize: scaleW(22),
          fontWeight: "600",
          color: "#FFF",
          textAlign: "center",
          opacity: 0.95,
          marginBottom: scaleW(4),
        },
        nextDate: {
          fontSize: scaleW(22),
          fontWeight: "600",
          color: "#FFF",
          textAlign: "center",
        },
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
        <View style={styles.seasonContainer}>
          <Animated.View
            entering={FadeInDown.duration(600).delay(0).springify().damping(18)}
            style={styles.imageCircleWrap}
          >
            <Image
              source={
                firstSeason?.hero_image
                  ? { uri: firstSeason.hero_image }
                  : WHISPERING_WIND_IMAGE
              }
              resizeMode="contain"
              style={styles.imageCircleImage}
            />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(500).delay(150).springify().damping(18)}>
            <ThemedText type="heading" style={styles.seasonLabel}>Season 1</ThemedText>
            <ThemedText type="heading" style={styles.seasonTitle}>
              {firstSeason?.name ?? "The Great Awakening"}
            </ThemedText>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(500).delay(280).springify().damping(18)}
            style={creamButtonAnimatedStyle}
          >
            <Pressable
              onPressIn={() => {
                creamButtonScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                creamButtonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
              style={styles.creamButton}
            >
              <ThemedText
                type="heading"
                style={{
                  fontSize: scaleW(16),
                  fontWeight: "600",
                  color: DARK_GREEN,
                }}
              >
                See the season story
              </ThemedText>
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.chapterContainer}>
          <Animated.View entering={FadeInDown.duration(500).delay(0).springify().damping(18)}>
            <ThemedText type="heading" style={styles.chapterTitle}>
              Chapter 4: Hidden Worlds
            </ThemedText>
            <ThemedText style={styles.releaseDate}>Released 14/02/25</ThemedText>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(500).delay(100).springify().damping(18)}>
            <ThemedText style={styles.bodyText}>
              Not everything is obvious.
            </ThemedText>
            <ThemedText style={styles.bodyText}>
              Some paths are quiet. Some worlds are small. Some things only appear when you look differently.
            </ThemedText>
            <ThemedText style={styles.bodyText}>
              Explorers are very good at noticing what others walk past.
            </ThemedText>
            <ThemedText style={[styles.bodyText, { marginBottom: scaleW(4) }]}>
              This week, look for what's hidden. Or create something that only
              explorers would find.
            </ThemedText>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(500).delay(200).springify().damping(18)}
            style={completeButtonAnimatedStyle}
          >
            <Pressable
              onPressIn={() => {
                completeButtonScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                completeButtonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
              style={styles.completeButton}
            >
              <ThemedText
                type="heading"
                style={{
                  fontSize: scaleW(15),
                  fontWeight: "600",
                  color: "#FFF",
                }}
              >
                1 / 2 missions complete →
              </ThemedText>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(280).springify().damping(18)}>
            <ThemedText type="heading" style={styles.nextLabel}>Next chapter coming on</ThemedText>
            <ThemedText type="heading" style={styles.nextDate}>21/02/25</ThemedText>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}
