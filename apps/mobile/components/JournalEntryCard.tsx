import React, { useMemo, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ActivityMap, regionForRoute } from "@/components/activity-map";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import type { CycleJournalMeta, HuntJournalMeta, JournalEntry, WalkJournalMeta } from "@/services/journalService";

export function formatJournalDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function tryParseTrackedMeta(notes: string | null): WalkJournalMeta | CycleJournalMeta | HuntJournalMeta | null {
  if (!notes) return null;
  if (!notes.trim().startsWith("{")) return null;
  try {
    const obj = JSON.parse(notes) as WalkJournalMeta | CycleJournalMeta | HuntJournalMeta;
    if (!obj || typeof obj !== "object" || !("type" in obj)) return null;
    if (obj.type === "walk" || obj.type === "cycle") {
      if (Array.isArray(obj.route)) return obj;
      return null;
    }
    if (obj.type === "hunt" && typeof obj.questName === "string") return obj;
    return null;
  } catch {
    return null;
  }
}

function formatDurationMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

interface JournalEntryCardProps {
  entry: JournalEntry;
  /** The explorer's name; falls back to the entry's nickname. */
  explorerName?: string;
  onPress?: () => void;
  animationDelay?: number;
}

export function JournalEntryCard({ entry, explorerName, onPress, animationDelay = 0 }: JournalEntryCardProps) {
  const trackedMeta = useMemo(() => tryParseTrackedMeta(entry.notes), [entry.notes]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const routeMeta = trackedMeta && (trackedMeta.type === "walk" || trackedMeta.type === "cycle") ? trackedMeta : null;
  const huntMeta = trackedMeta?.type === "hunt" ? trackedMeta : null;
  const trackedRegion = useMemo(() => {
    if (!routeMeta || routeMeta.route.length === 0) return null;
    return regionForRoute(routeMeta.route);
  }, [routeMeta]);
  const trackedDurationMs = useMemo(() => {
    if (!routeMeta) return 0;
    const started = new Date(routeMeta.startedAt).getTime();
    const ended = new Date(routeMeta.endedAt).getTime();
    return Math.max(0, ended - started);
  }, [routeMeta]);
  const xpLabel = huntMeta ? `+${Math.max(0, huntMeta.xp)} XP` : "+5 XP";
  const byName = explorerName || entry.profile?.nickname || "";
  const people = (routeMeta?.selectedProfiles ?? huntMeta?.selectedProfiles ?? []).slice(0, 6);
  const photos = (routeMeta?.photoUrls ?? huntMeta?.photoUrls ?? []).slice(0, 4);

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(animationDelay)}>
      <Pressable style={styles.card} onPress={onPress} disabled={!onPress}>
        <View style={styles.headerRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{entry.activity_tag}</Text>
          </View>
          <Text style={styles.date}>{formatJournalDate(new Date(`${entry.entry_date}T12:00:00`))}</Text>
        </View>

        {routeMeta ? (
          <>
            <Text style={styles.title} numberOfLines={2}>
              {routeMeta.type === "cycle" ? "Bike ride" : "Walk"}
            </Text>
            <View style={styles.stats}>
              <Stat label="Distance" value={formatDistance(routeMeta.distanceMeters)} />
              <Stat label="Time" value={formatDurationMs(trackedDurationMs)} />
              {"steps" in routeMeta ? (
                <Stat label="Steps" value={routeMeta.steps == null ? "Not tracked" : `${routeMeta.steps}`} />
              ) : null}
            </View>
            {trackedRegion && routeMeta.route.length >= 2 ? (
              <View style={styles.mapWrap}>
                <ActivityMap
                  style={styles.map}
                  initialRegion={trackedRegion}
                  route={routeMeta.route}
                  fitRoute
                  routeStrokeWidth={5}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  pointerEvents="none"
                />
              </View>
            ) : null}
          </>
        ) : huntMeta ? (
          <>
            <Text style={styles.title} numberOfLines={2}>
              {huntMeta.questName}
            </Text>
            <View style={styles.stats}>
              <Stat label="Found" value={`${huntMeta.itemsFoundThisSession}`} />
              <Stat label="Status" value={huntMeta.complete ? "Finished" : "Still going"} />
            </View>
            {(huntMeta.foundItemNames?.length ?? 0) > 0 ? (
              <View style={styles.chips}>
                {(huntMeta.foundItemNames ?? []).slice(0, 8).map((name) => (
                  <View key={name} style={styles.chip}>
                    <Text style={styles.chipText}>{name}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.contentRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>
                {entry.title}
              </Text>
              {entry.notes ? (
                <Text style={styles.notes} numberOfLines={3}>
                  {entry.notes}
                </Text>
              ) : null}
            </View>
            {entry.photo_url ? (
              <Pressable
                onPress={() => setPreviewUri(entry.photo_url!)}
                accessibilityRole="button"
                accessibilityLabel="View photo"
              >
                <Image source={{ uri: entry.photo_url }} style={styles.thumbnail} resizeMode="cover" />
              </Pressable>
            ) : null}
          </View>
        )}

        {people.length > 0 ? (
          <View style={styles.chips}>
            {people.map((p) => (
              <View key={p.id} style={styles.chip}>
                <Text style={styles.chipText}>{p.nickname || "Explorer"}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {photos.length > 0 ? (
          <View style={styles.photoRow}>
            {photos.map((url) => (
              <Pressable key={url} onPress={() => setPreviewUri(url)} accessibilityRole="button" accessibilityLabel="View photo">
                <Image source={{ uri: url }} style={styles.smallPhoto} resizeMode="cover" />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.by}>{!trackedMeta && byName ? byName : ""}</Text>
          <Text style={styles.xp}>{xpLabel}</Text>
        </View>
      </Pressable>

      <PhotoPreview uri={previewUri} onClose={() => setPreviewUri(null)} />
    </Animated.View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

/** Full-screen photo viewer shared by the journal cards. */
export function PhotoPreview({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  return (
    <Modal visible={uri != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.previewBackdrop} onPress={onClose}>
        {uri != null ? <Image source={{ uri }} style={styles.previewImage} resizeMode="contain" /> : null}
        <View style={styles.previewCloseWrap} pointerEvents="box-none">
          <Pressable style={styles.previewClose} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close photo">
            <Ionicons name="close" size={28} color={FK.white} />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export const journalCardStyles = StyleSheet.create({
  card: { backgroundColor: FK.paper, borderRadius: RADIUS.lg, padding: 18, marginBottom: 12, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  date: { fontFamily: FONT.bodyBold, fontSize: 14, color: FK.muted },
  title: { ...TYPE.heading, marginBottom: 4 },
  by: { fontFamily: FONT.displayBold, fontSize: 14, color: FK.muted },
});

const styles = StyleSheet.create({
  ...journalCardStyles,
  tag: { backgroundColor: "#E3E8DA", borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontFamily: FONT.displayBold, fontSize: 13, color: FK.ink },
  contentRow: { flexDirection: "row", gap: 12 },
  notes: { fontFamily: FONT.body, fontSize: 16, lineHeight: 23, color: FK.ink },
  thumbnail: { width: 84, height: 84, borderRadius: RADIUS.sm, backgroundColor: FK.line },
  stats: { flexDirection: "row", gap: 8, marginTop: 8 },
  stat: { flex: 1, backgroundColor: FK.moss, borderRadius: RADIUS.sm, paddingVertical: 10, paddingHorizontal: 10 },
  statLabel: { fontFamily: FONT.bodyBold, fontSize: 12, color: FK.muted },
  statValue: { fontFamily: FONT.display, fontSize: 16, color: FK.ink, marginTop: 2 },
  mapWrap: { borderRadius: RADIUS.sm, overflow: "hidden", marginTop: 10, backgroundColor: FK.line },
  map: { width: "100%", height: 140 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: { backgroundColor: FK.moss, borderRadius: RADIUS.pill, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontFamily: FONT.displayBold, fontSize: 13, color: FK.ink },
  photoRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  smallPhoto: { width: 60, height: 60, borderRadius: 12, backgroundColor: FK.line },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: FK.line,
  },
  xp: { fontFamily: FONT.displayBold, fontSize: 14, color: FK.forest },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  previewImage: { width: "100%", height: "100%", borderRadius: RADIUS.md },
  previewClose: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewCloseWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    elevation: 2,
  },
});
