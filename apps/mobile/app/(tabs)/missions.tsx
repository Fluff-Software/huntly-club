import React, { useMemo } from "react";
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  Platform,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { MissionCard } from "@/components/MissionCard";
import { MISSION_CARDS } from "@/constants/missionCards";

const WHISPERING_WIND_IMAGE = require("@/assets/images/whispering-wind.png");

const MISSIONS_ORANGE = "#D2684B";

export default function MissionsScreen() {
  const { scaleW, scaleH, width } = useLayoutScale();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: MISSIONS_ORANGE },
        scrollContent: {
          flexGrow: 1,
          backgroundColor: MISSIONS_ORANGE,
          paddingTop: scaleH(24),
        },
        imageCircleWrap: {
          width: width * 2.5,
          height: width * 2.5,
          borderRadius: (width * 2.5) / 2,
          overflow: "hidden" as const,
          marginBottom: scaleH(20),
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
          marginTop: scaleH(8),
          marginBottom: scaleH(24),
        },
        cardsScroll: { overflow: "visible" as const },
        cardsContent: {
          paddingLeft: Math.max(0, (width - scaleW(280)) / 2),
          paddingRight: scaleW(16),
          paddingBottom: scaleW(8),
          gap: scaleW(12),
        },
      }),
    [scaleW, scaleH, width]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageCircleWrap}>
          <Image
            source={WHISPERING_WIND_IMAGE}
            resizeMode="contain"
            style={styles.imageCircleImage}
          />
        </View>
        <ThemedText type="heading" style={styles.title}>Missions</ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsContent}
          style={styles.cardsScroll}
          nestedScrollEnabled={Platform.OS === "android"}
          removeClippedSubviews={false}
          overScrollMode="never"
        >
          {MISSION_CARDS.map((card, index) => (
            <MissionCard
              key={card.id}
              card={card}
              tiltDeg={index % 2 === 0 ? -0.5 : 0.5}
              marginTopOffset={index % 2 === 0 ? scaleW(-2) : scaleW(2)}
            />
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}
