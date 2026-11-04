import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { formatJournalDate, journalCardStyles, PhotoPreview } from "@/components/JournalEntryCard";
import { FK, FONT, RADIUS } from "@/constants/fieldKit";
import type { CompletedMissionEntry } from "@/services/journalService";

interface JournalMissionCardProps {
  mission: CompletedMissionEntry;
  /** The explorer's name; falls back to the mission's nickname. */
  explorerName?: string;
  onPress?: () => void;
  animationDelay?: number;
}

export function JournalMissionCard({ mission, explorerName, onPress, animationDelay = 0 }: JournalMissionCardProps) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const byName = explorerName || mission.profile?.nickname || "";
  const displayPhotos = mission.photos.slice(0, 3);
  const answers = [
    { q: mission.debrief_question_1, a: mission.debrief_answer_1 },
    { q: mission.debrief_question_2, a: mission.debrief_answer_2 },
  ].filter((x) => !!x.a);

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(animationDelay)}>
      <Pressable style={journalCardStyles.card} onPress={onPress} disabled={!onPress}>
        <View style={journalCardStyles.headerRow}>
          <View style={styles.tag}>
            <Ionicons name="checkmark-circle" size={15} color={FK.white} />
            <Text style={styles.tagText}>Mission done</Text>
          </View>
          <Text style={journalCardStyles.date}>{formatJournalDate(new Date(mission.completed_at))}</Text>
        </View>

        <Text style={journalCardStyles.title} numberOfLines={2}>
          {mission.activity_title}
        </Text>

        {answers.map((x, i) => (
          <View key={i} style={styles.answer}>
            {x.q ? (
              <Text style={styles.question} numberOfLines={2}>
                {x.q}
              </Text>
            ) : null}
            <Text style={styles.answerText} numberOfLines={4}>
              “{x.a}”
            </Text>
          </View>
        ))}

        {displayPhotos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photoStrip}
            contentContainerStyle={styles.photoStripContent}
          >
            {displayPhotos.map((photoUrl, idx) => (
              <Pressable
                key={`${photoUrl}-${idx}`}
                onPress={() => setPreviewUri(photoUrl)}
                accessibilityRole="button"
                accessibilityLabel="View photo"
              >
                <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {byName ? <Text style={[journalCardStyles.by, { marginTop: 12 }]}>{byName}</Text> : null}
      </Pressable>

      <PhotoPreview uri={previewUri} onClose={() => setPreviewUri(null)} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: FK.forest,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: { fontFamily: FONT.displayBold, fontSize: 13, color: FK.white },
  answer: { backgroundColor: FK.moss, borderRadius: RADIUS.sm, padding: 12, marginTop: 8 },
  question: { fontFamily: FONT.bodyBold, fontSize: 13, lineHeight: 18, color: FK.muted, marginBottom: 2 },
  answerText: { fontFamily: FONT.body, fontSize: 16, lineHeight: 23, color: FK.ink },
  photoStrip: { marginTop: 12, marginHorizontal: -18 },
  photoStripContent: { paddingHorizontal: 18, gap: 10 },
  photo: { width: 200, height: 200, borderRadius: RADIUS.md, backgroundColor: FK.line },
});
