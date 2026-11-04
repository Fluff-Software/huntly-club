import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { FKButton, FKCard, FKEyebrow, FKPageHeader, FKSkeleton } from "@/components/fieldkit";
import { JournalEntryCard } from "@/components/JournalEntryCard";
import { JournalMissionCard } from "@/components/JournalMissionCard";
import { AddJournalEntryModal } from "@/components/AddJournalEntryModal";
import { FK, TYPE } from "@/constants/fieldKit";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUser } from "@/contexts/UserContext";
import {
  getJournalTimeline,
  preloadJournalTimelineCardImages,
  type JournalEntry,
  type JournalTimelineItem,
} from "@/services/journalService";
import { familySentence } from "@/utils/familyNames";

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.navigate("/(tabs)/me");
};

function monthLabel(sortDate: string): string {
  const d = new Date(sortDate);
  if (Number.isNaN(d.getTime())) return "Earlier";
  const now = new Date();
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return "This month";
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** The family's adventure journal: finished missions plus anything they add themselves. */
export default function JournalBookScreen() {
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
      if (!isMountedRef.current) return;
      await preloadJournalTimelineCardImages(data);
      if (isMountedRef.current) setTimeline(data);
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
      setStatusBarStyle("dark");
      void loadTimeline();
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

  const nameById = useMemo(() => {
    const map: Record<number, string> = {};
    profiles.forEach((p) => {
      map[p.id] = p.name || p.nickname || "";
    });
    return map;
  }, [profiles]);

  // Group into months, keeping the timeline's own order.
  const sections = useMemo(() => {
    const out: { label: string; items: JournalTimelineItem[] }[] = [];
    timeline.forEach((item) => {
      const label = monthLabel(item.sortDate);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(item);
      else out.push({ label, items: [item] });
    });
    return out;
  }, [timeline]);

  const canAdd = teamId != null;
  const who = familySentence(profiles.map((p) => p.name || p.nickname), "your explorers");

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FKPageHeader title="Journal" onBack={goBack} />
        <Text style={[TYPE.body, { color: FK.muted, marginTop: -8 }]}>
          Everything {who} {profiles.length === 1 ? "has" : "have"} been up to, in one place.
        </Text>

        {canAdd ? (
          <FKButton label="Add an adventure" icon="add" onPress={() => setShowAddModal(true)} style={{ marginTop: 18 }} />
        ) : null}

        {!hasLoadedOnce && loading ? (
          <View style={{ gap: 12, marginTop: 24 }}>
            <FKSkeleton height={18} style={{ width: 120, borderRadius: 9 }} />
            <FKSkeleton height={150} />
            <FKSkeleton height={120} />
            <FKSkeleton height={150} />
          </View>
        ) : null}

        {hasLoadedOnce && timeline.length === 0 ? (
          <FKCard style={{ marginTop: 24 }}>
            <Text style={TYPE.heading}>Nothing here yet</Text>
            <Text style={[TYPE.body, { marginTop: 6 }]}>
              Finished missions appear here by themselves. You can also add a walk, a bike ride or anything else you
              got up to.
            </Text>
          </FKCard>
        ) : null}

        {hasLoadedOnce
          ? sections.map((section, sIndex) => (
              <View key={`${section.label}-${sIndex}`}>
                <FKEyebrow style={styles.section}>{section.label}</FKEyebrow>
                {section.items.map((item, index) =>
                  item.type === "manual" ? (
                    <JournalEntryCard
                      key={`manual-${item.entry.id}`}
                      entry={item.entry}
                      explorerName={nameById[item.entry.profile_id]}
                      animationDelay={Math.min(index * 40, 400)}
                    />
                  ) : (
                    <JournalMissionCard
                      key={`mission-${item.mission.id}`}
                      mission={item.mission}
                      explorerName={nameById[item.mission.profile_id]}
                      animationDelay={Math.min(index * 40, 400)}
                    />
                  )
                )}
              </View>
            ))
          : null}
      </ScrollView>

      <AddJournalEntryModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleEntryAdded}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FK.moss },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, width: "100%", maxWidth: 720, alignSelf: "center" },
  section: { marginTop: 24, marginBottom: 10 },
});
