import React, { useMemo } from "react";
import { View, Image, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import type { JournalEntry } from "@/services/journalService";

const PARCHMENT = "#FFFDF7";
const PARCHMENT_BORDER = "#D9C9A3";
const AMBER = "#B07D3E";
const CHARCOAL = "#3D3D3D";
const MUTED = "#8A8A8A";

function formatEntryDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy.slice(-2)}`;
  }
  return iso;
}

interface JournalEntryCardProps {
  entry: JournalEntry;
  onPress?: () => void;
  animationDelay?: number;
}

export function JournalEntryCard({
  entry,
  onPress,
  animationDelay = 0,
}: JournalEntryCardProps) {
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
          overflow: "hidden",
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
        tagChip: {
          backgroundColor: "rgba(176,125,62,0.15)",
          borderRadius: scaleW(12),
          paddingHorizontal: scaleW(10),
          paddingVertical: scaleW(3),
        },
        tagText: {
          fontSize: scaleW(12),
          color: AMBER,
          fontWeight: "600",
        },
        dateText: {
          fontSize: scaleW(12),
          color: MUTED,
        },
        contentRow: {
          flexDirection: "row",
          gap: scaleW(12),
        },
        textBlock: {
          flex: 1,
        },
        title: {
          fontSize: scaleW(16),
          fontWeight: "700",
          color: CHARCOAL,
          marginBottom: scaleW(4),
        },
        notes: {
          fontSize: scaleW(13),
          color: CHARCOAL,
          opacity: 0.75,
          lineHeight: scaleW(18),
        },
        thumbnail: {
          width: scaleW(80),
          height: scaleW(80),
          borderRadius: scaleW(10),
          backgroundColor: PARCHMENT_BORDER,
        },
        footer: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: scaleW(10),
          paddingTop: scaleW(8),
          borderTopWidth: 1,
          borderTopColor: PARCHMENT_BORDER,
        },
        byText: {
          fontSize: scaleW(12),
          color: MUTED,
        },
        xpRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: scaleW(3),
        },
        xpText: {
          fontSize: scaleW(12),
          color: AMBER,
          fontWeight: "600",
        },
      }),
    [scaleW]
  );

  const nickname = entry.profile?.nickname ?? "";

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(animationDelay)}>
      <Pressable style={styles.card} onPress={onPress} disabled={!onPress}>
        <View style={styles.cardInner}>
          <View style={styles.headerRow}>
            <View style={styles.tagChip}>
              <ThemedText style={styles.tagText}>{entry.activity_tag}</ThemedText>
            </View>
            <ThemedText style={styles.dateText}>
              {formatEntryDate(entry.entry_date)}
            </ThemedText>
          </View>

          <View style={styles.contentRow}>
            <View style={styles.textBlock}>
              <ThemedText style={styles.title} numberOfLines={2}>
                {entry.title}
              </ThemedText>
              {!!entry.notes && (
                <ThemedText style={styles.notes} numberOfLines={2}>
                  {entry.notes}
                </ThemedText>
              )}
            </View>
            {!!entry.photo_url && (
              <Image
                source={{ uri: entry.photo_url }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            )}
          </View>

          <View style={styles.footer}>
            <ThemedText style={styles.byText}>
              {nickname ? `by ${nickname}` : ""}
            </ThemedText>
            <View style={styles.xpRow}>
              <MaterialIcons name="star" size={scaleW(14)} color={AMBER} />
              <ThemedText style={styles.xpText}>+5 XP</ThemedText>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
