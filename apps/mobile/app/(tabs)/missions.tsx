import React, { useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { BackHeader } from "@/components/BackHeader";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useChaptersWithActivities, type ChapterWithActivities } from "@/hooks/useAllChaptersActivities";
import { MissionCard } from "@/components/MissionCard";

const MISSIONS_ORANGE = "#D2684B";

function chapterSectionTitle(chapter: ChapterWithActivities): string {
  const title = chapter.title?.trim() || "Missions";
  return `Week ${chapter.week_number} - ${title}`;
}

export default function MissionsScreen() {
  const { scaleW } = useLayoutScale();
  const { chapters, loading, error, refetch } = useChaptersWithActivities();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: MISSIONS_ORANGE },
        scrollContent: {
          flexGrow: 1,
          backgroundColor: MISSIONS_ORANGE,
          paddingTop: scaleW(12),
          paddingBottom: scaleW(32),
        },
        title: {
          fontSize: scaleW(24),
          lineHeight: scaleW(32),
          fontWeight: "600",
          color: "#FFF",
          textAlign: "center" as const,
          marginBottom: scaleW(12),
        },
        sectionTitle: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: "#FFF",
          marginBottom: scaleW(12),
          marginHorizontal: scaleW(20),
          opacity: 0.95,
        },
        sectionBlock: {
          marginBottom: scaleW(28),
        },
        cardWrap: {
          marginBottom: scaleW(16),
          paddingHorizontal: scaleW(20),
        },
        loadingContainer: {
          paddingVertical: scaleW(48),
          alignItems: "center" as const,
        },
        errorContainer: {
          paddingVertical: scaleW(24),
          paddingHorizontal: scaleW(24),
          alignItems: "center" as const,
        },
        errorText: { fontSize: scaleW(16), color: "#FFF", textAlign: "center" as const, marginBottom: scaleW(16) },
        retryButton: {
          backgroundColor: "#F4F0EB",
          borderRadius: scaleW(28),
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(32),
        },
        emptyText: { fontSize: scaleW(16), color: "#FFF", textAlign: "center" as const, opacity: 0.9 },
      }),
    [scaleW]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={{ paddingHorizontal: scaleW(20), paddingBottom: scaleW(4), backgroundColor: MISSIONS_ORANGE }}>
        <BackHeader backToLabel="Clubhouse" variant="dark" />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <Animated.View entering={FadeInDown.duration(500).delay(0).springify().damping(18)}>
          <ThemedText type="heading" style={styles.title}>Current Missions</ThemedText>
        </Animated.View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFF" />
            <ThemedText style={[styles.emptyText, { marginTop: scaleW(16) }]}>Loading missions…</ThemedText>
          </View>
        )}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable style={styles.retryButton} onPress={refetch}>
              <ThemedText type="heading" style={{ fontSize: scaleW(16), fontWeight: "600", color: "#2D5A27" }}>
                Retry
              </ThemedText>
            </Pressable>
          </View>
        )}

        {!loading && !error && (
          <>
            {chapters.length === 0 ? (
              <View style={[styles.loadingContainer, { paddingVertical: scaleW(24) }]}>
                <ThemedText style={styles.emptyText}>No chapters yet.</ThemedText>
              </View>
            ) : (
              <>
                {/* Current missions (latest chapter) */}
                <Animated.View
                  key={chapters[0].id}
                  entering={FadeInDown.duration(400).delay(80).springify().damping(18)}
                  style={styles.sectionBlock}
                >
                  <ThemedText type="heading" style={styles.sectionTitle}>
                    {chapterSectionTitle(chapters[0])}
                  </ThemedText>
                  {chapters[0].activities.length === 0 ? (
                    <View style={{ paddingHorizontal: scaleW(20), paddingVertical: scaleW(12) }}>
                      <ThemedText style={styles.emptyText}>No missions for this chapter yet.</ThemedText>
                    </View>
                  ) : (
                    chapters[0].activities.map((card) => (
                      <View key={card.id} style={styles.cardWrap}>
                        <MissionCard card={card} xp={card.xp} tiltDeg={0} />
                      </View>
                    ))
                  )}
                </Animated.View>

                {/* Previous missions label + sections for earlier chapters */}
                {chapters.length > 1 && (
                  <>
                    <ThemedText type="heading" style={styles.sectionTitle}>
                      Previous missions
                    </ThemedText>
                    {chapters.slice(1).map((chapter, index) => (
                      <Animated.View
                        key={chapter.id}
                        entering={FadeInDown.duration(400).delay(140 + index * 60).springify().damping(18)}
                        style={styles.sectionBlock}
                      >
                        <ThemedText type="heading" style={styles.sectionTitle}>
                          {chapterSectionTitle(chapter)}
                        </ThemedText>
                        {chapter.activities.length === 0 ? (
                          <View style={{ paddingHorizontal: scaleW(20), paddingVertical: scaleW(12) }}>
                            <ThemedText style={styles.emptyText}>No missions for this chapter yet.</ThemedText>
                          </View>
                        ) : (
                          chapter.activities.map((card) => (
                            <View key={card.id} style={styles.cardWrap}>
                              <MissionCard card={card} xp={card.xp} tiltDeg={0} />
                            </View>
                          ))
                        )}
                      </Animated.View>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
