import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { JournalEntryCard } from "@/components/JournalEntryCard";
import { JournalMissionCard } from "@/components/JournalMissionCard";
import { AddJournalEntryModal } from "@/components/AddJournalEntryModal";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUser } from "@/contexts/UserContext";
import {
  getJournalTimeline,
  type JournalEntry,
  type JournalTimelineItem,
} from "@/services/journalService";

const JOURNAL_AMBER = "#B07D3E";
const CREAM = "#F4F0EB";

export default function JournalScreen() {
  const { scaleW } = useLayoutScale();
  const { user } = useAuth();
  const { profiles } = usePlayer();
  const { teamId } = useUser();

  const [timeline, setTimeline] = useState<JournalTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const isMountedRef = useRef(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadTimeline = useCallback(async () => {
    if (!user?.id) return;

    const profileIds = profiles.map((p) => p.id);

    try {
      const data = await getJournalTimeline(user.id, profileIds);
      if (isMountedRef.current) {
        setTimeline(data);
      }
    } catch (err) {
      console.error("Error loading journal timeline:", err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setHasLoadedOnce(true);
      }
    }
  }, [user?.id, profiles]);

  useFocusEffect(
    useCallback(() => {
      loadTimeline();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [loadTimeline])
  );

  const handleEntryAdded = useCallback((newEntry: JournalEntry) => {
    const newItem: JournalTimelineItem = {
      type: "manual",
      sortDate: `${newEntry.entry_date}T23:59:59`,
      entry: newEntry,
    };
    setTimeline((prev) => [newItem, ...prev]);
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: JOURNAL_AMBER,
        },
        scrollContent: {
          flexGrow: 1,
          paddingTop: scaleW(12),
          paddingBottom: scaleW(100), // room for FAB
        },
        heading: {
          fontSize: scaleW(24),
          fontWeight: "700",
          color: "#FFF",
          textAlign: "center",
          marginBottom: scaleW(4),
        },
        subtitle: {
          fontSize: scaleW(14),
          color: "rgba(255,255,255,0.8)",
          textAlign: "center",
          marginBottom: scaleW(20),
        },
        loadingContainer: {
          paddingVertical: scaleW(48),
          alignItems: "center",
        },
        emptyContainer: {
          paddingVertical: scaleW(48),
          paddingHorizontal: scaleW(32),
          alignItems: "center",
        },
        emptyTitle: {
          fontSize: scaleW(20),
          fontWeight: "700",
          color: "#FFF",
          textAlign: "center",
          marginTop: scaleW(16),
          marginBottom: scaleW(8),
        },
        emptyBody: {
          fontSize: scaleW(14),
          color: "rgba(255,255,255,0.8)",
          textAlign: "center",
          lineHeight: scaleW(20),
          marginBottom: scaleW(8),
        },
        emptyAddButton: {
          marginTop: scaleW(20),
          backgroundColor: CREAM,
          borderRadius: scaleW(28),
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(28),
        },
        emptyAddButtonText: {
          fontSize: scaleW(15),
          fontWeight: "700",
          color: JOURNAL_AMBER,
        },
        fab: {
          position: "absolute",
          bottom: scaleW(24),
          right: scaleW(24),
          width: scaleW(56),
          height: scaleW(56),
          borderRadius: scaleW(28),
          backgroundColor: CREAM,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: scaleW(3) },
          shadowOpacity: 0.2,
          shadowRadius: scaleW(6),
          elevation: 6,
        },
      }),
    [scaleW]
  );

  const showFab = teamId != null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <Animated.View entering={FadeInDown.duration(500).delay(0)}>
          <ThemedText type="heading" style={styles.heading}>
            Adventure Journal
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Your family's outdoor story
          </ThemedText>
        </Animated.View>

        {!hasLoadedOnce && loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        )}

        {hasLoadedOnce && timeline.length === 0 && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={styles.emptyContainer}
          >
            <MaterialIcons name="eco" size={scaleW(48)} color={CREAM} />
            <ThemedText style={styles.emptyTitle}>
              Your adventures start here!
            </ThemedText>
            <ThemedText style={styles.emptyBody}>
              Completed missions will appear here automatically.
            </ThemedText>
            <ThemedText style={styles.emptyBody}>
              Add your own adventures to build your family's story.
            </ThemedText>
            {showFab && (
              <Pressable
                style={styles.emptyAddButton}
                onPress={() => setShowAddModal(true)}
              >
                <ThemedText style={styles.emptyAddButtonText}>
                  Add your first entry
                </ThemedText>
              </Pressable>
            )}
          </Animated.View>
        )}

        {hasLoadedOnce &&
          timeline.map((item, index) =>
            item.type === "manual" ? (
              <JournalEntryCard
                key={`manual-${item.entry.id}`}
                entry={item.entry}
                animationDelay={Math.min(index * 40, 400)}
              />
            ) : (
              <JournalMissionCard
                key={`mission-${item.mission.id}`}
                mission={item.mission}
                animationDelay={Math.min(index * 40, 400)}
              />
            )
          )}
      </ScrollView>

      {showFab && (
        <Pressable style={styles.fab} onPress={() => setShowAddModal(true)}>
          <MaterialIcons name="add" size={scaleW(28)} color={JOURNAL_AMBER} />
        </Pressable>
      )}

      <AddJournalEntryModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleEntryAdded}
      />
    </SafeAreaView>
  );
}
