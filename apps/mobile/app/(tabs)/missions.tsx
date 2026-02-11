import React, { useRef, useMemo } from "react";
import {
  View,
  ScrollView,
  Image,
  Animated as RNAnimated,
  StyleSheet,
  Platform,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { MissionCard } from "@/components/MissionCard";
import { MISSION_CARDS } from "@/constants/missionCards";

const WHISPERING_WIND_IMAGE = require("@/assets/images/whispering-wind.png");

const MISSIONS_ORANGE = "#D2684B";

export default function MissionsScreen() {
  const { scaleW, width } = useLayoutScale();
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
            source={WHISPERING_WIND_IMAGE}
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
