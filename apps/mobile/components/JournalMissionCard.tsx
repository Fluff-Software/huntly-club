import React, { useMemo } from "react";
import { View, Image, ScrollView, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import type { CompletedMissionEntry } from "@/services/journalService";

const PARCHMENT = "#FFFDF7";
const PARCHMENT_BORDER = "#D9C9A3";
const MISSION_GREEN = "#2D5A27";
const MISSION_GREEN_BG = "rgba(45,90,39,0.12)";
const CHARCOAL = "#3D3D3D";
const MUTED = "#8A8A8A";

function formatCompletedAt(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

interface JournalMissionCardProps {
  mission: CompletedMissionEntry;
  onPress?: () => void;
  animationDelay?: number;
}

export function JournalMissionCard({
  mission,
  onPress,
  animationDelay = 0,
}: JournalMissionCardProps) {
  const { scaleW } = useLayoutScale();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: PARCHMENT,
          borderRadius: scaleW(16),
          borderWidth: 1.5,
          borderColor: PARCHMENT_BORDER,
          marginHorizontal: scaleW(16),
          marginBottom: scaleW(12),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: scaleW(2) },
          shadowOpacity: 0.08,
          shadowRadius: scaleW(4),
          elevation: 2,
        },
        cardInner: {
          padding: scaleW(16),
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: scaleW(8),
        },
        missionBadge: {
          backgroundColor: MISSION_GREEN_BG,
          borderRadius: scaleW(12),
          paddingHorizontal: scaleW(10),
          paddingVertical: scaleW(3),
        },
        missionBadgeText: {
          fontSize: scaleW(12),
          color: MISSION_GREEN,
          fontWeight: "600",
        },
        dateText: {
          fontSize: scaleW(12),
          color: MUTED,
        },
        title: {
          fontSize: scaleW(16),
          fontWeight: "700",
          color: CHARCOAL,
          marginBottom: scaleW(6),
        },
        debriefBlock: {
          marginBottom: scaleW(8),
        },
        debriefQuestion: {
          fontSize: scaleW(11),
          fontWeight: "600",
          color: MUTED,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          marginBottom: scaleW(2),
        },
        debriefAnswer: {
          fontSize: scaleW(13),
          color: CHARCOAL,
          opacity: 0.8,
          fontStyle: "italic",
          lineHeight: scaleW(18),
        },
        photoStrip: {
          marginTop: scaleW(12),
          marginHorizontal: -scaleW(16), // bleed to card edges
        },
        photoStripContent: {
          paddingHorizontal: scaleW(16),
          gap: scaleW(16),
        },
        polaroid: {
          backgroundColor: "#FFFFFF",
          padding: scaleW(8),
          paddingBottom: scaleW(28),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: scaleW(3) },
          shadowOpacity: 0.15,
          shadowRadius: scaleW(6),
          elevation: 4,
          width: scaleW(220),
        },
        polaroidImage: {
          width: "100%",
          aspectRatio: 1,
          backgroundColor: PARCHMENT_BORDER,
        },
        footer: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: scaleW(10),
          paddingTop: scaleW(8),
          borderTopWidth: 1,
          borderTopColor: PARCHMENT_BORDER,
        },
        byText: {
          fontSize: scaleW(12),
          color: MUTED,
        },
      }),
    [scaleW]
  );

  const nickname = mission.profile?.nickname ?? "";
  const displayPhotos = mission.photos.slice(0, 3);

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(animationDelay)}>
      <Pressable style={styles.card} onPress={onPress} disabled={!onPress}>
        <View style={styles.cardInner}>
          <View style={styles.headerRow}>
            <View style={styles.missionBadge}>
              <ThemedText style={styles.missionBadgeText}>
                Mission completed
              </ThemedText>
            </View>
            <ThemedText style={styles.dateText}>
              {formatCompletedAt(mission.completed_at)}
            </ThemedText>
          </View>

          <ThemedText style={styles.title} numberOfLines={2}>
            {mission.activity_title}
          </ThemedText>

          {!!mission.debrief_answer_1 && (
            <View style={styles.debriefBlock}>
              {!!mission.debrief_question_1 && (
                <ThemedText style={styles.debriefQuestion} numberOfLines={2}>
                  {mission.debrief_question_1}
                </ThemedText>
              )}
              <ThemedText style={styles.debriefAnswer} numberOfLines={4}>
                "{mission.debrief_answer_1}"
              </ThemedText>
            </View>
          )}
          {!!mission.debrief_answer_2 && (
            <View style={styles.debriefBlock}>
              {!!mission.debrief_question_2 && (
                <ThemedText style={styles.debriefQuestion} numberOfLines={2}>
                  {mission.debrief_question_2}
                </ThemedText>
              )}
              <ThemedText style={styles.debriefAnswer} numberOfLines={4}>
                "{mission.debrief_answer_2}"
              </ThemedText>
            </View>
          )}

          {displayPhotos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoStrip}
              contentContainerStyle={styles.photoStripContent}
            >
              {displayPhotos.map((photoUrl, idx) => (
                <View key={idx} style={styles.polaroid}>
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.polaroidImage}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.footer}>
            <ThemedText style={styles.byText}>
              {nickname ? `by ${nickname}` : ""}
            </ThemedText>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
