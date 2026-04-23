import React, { useMemo, useState } from "react";
import { View, Image, Modal, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Polyline } from "react-native-maps";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import type { CycleJournalMeta, JournalEntry, WalkJournalMeta } from "@/services/journalService";

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

function tryParseTrackedMeta(notes: string | null): WalkJournalMeta | CycleJournalMeta | null {
  if (!notes) return null;
  if (!notes.trim().startsWith("{")) return null;
  try {
    const obj = JSON.parse(notes) as WalkJournalMeta | CycleJournalMeta;
    if (obj && (obj.type === "walk" || obj.type === "cycle") && Array.isArray(obj.route)) return obj;
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
  const remMins = minutes % 60;
  return `${hours}h ${remMins}m`;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function regionForRoute(route: { latitude: number; longitude: number }[]) {
  if (route.length === 0) return null;
  let minLat = route[0]!.latitude;
  let maxLat = route[0]!.latitude;
  let minLon = route[0]!.longitude;
  let maxLon = route[0]!.longitude;
  for (const p of route) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLon) minLon = p.longitude;
    if (p.longitude > maxLon) maxLon = p.longitude;
  }
  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLon + maxLon) / 2;
  const latDeltaRaw = Math.max(0.001, maxLat - minLat);
  const lonDeltaRaw = Math.max(0.001, maxLon - minLon);
  const padding = 1.6; // a little extra breathing room
  return {
    latitude,
    longitude,
    latitudeDelta: Math.max(0.01, latDeltaRaw * padding),
    longitudeDelta: Math.max(0.01, lonDeltaRaw * padding),
  };
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
  const trackedMeta = useMemo(() => tryParseTrackedMeta(entry.notes), [entry.notes]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const trackedRegion = useMemo(() => {
    if (!trackedMeta || trackedMeta.route.length === 0) return null;
    return regionForRoute(trackedMeta.route);
  }, [trackedMeta]);
  const trackedDurationMs = useMemo(() => {
    if (!trackedMeta) return 0;
    const started = new Date(trackedMeta.startedAt).getTime();
    const ended = new Date(trackedMeta.endedAt).getTime();
    return Math.max(0, ended - started);
  }, [trackedMeta]);

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
        walkMapWrap: {
          backgroundColor: PARCHMENT_BORDER,
          borderRadius: scaleW(12),
          overflow: "hidden",
          marginTop: scaleW(10),
        },
        walkMap: { width: "100%", height: scaleW(140) },
        walkStatsRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          gap: scaleW(10),
          marginTop: scaleW(10),
        },
        walkStatChip: {
          flex: 1,
          backgroundColor: "rgba(176,125,62,0.12)",
          borderRadius: scaleW(12),
          paddingVertical: scaleW(8),
          paddingHorizontal: scaleW(10),
          alignItems: "center",
        },
        walkStatLabel: { fontSize: scaleW(11), color: AMBER, fontWeight: "700" },
        walkStatValue: { marginTop: 2, fontSize: scaleW(14), color: CHARCOAL, fontWeight: "800" },
        walkPhotoRow: { flexDirection: "row", gap: scaleW(8), marginTop: scaleW(10) },
        walkPhoto: { width: scaleW(54), height: scaleW(54), borderRadius: scaleW(10), backgroundColor: PARCHMENT_BORDER },
        chipRow: { flexDirection: "row", flexWrap: "wrap", gap: scaleW(6), marginTop: scaleW(10) },
        chip: { backgroundColor: "rgba(176,125,62,0.12)", borderRadius: scaleW(999), paddingVertical: scaleW(6), paddingHorizontal: scaleW(10) },
        chipText: { fontSize: scaleW(12), fontWeight: "800", color: AMBER },
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
        previewBackdrop: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.92)",
          justifyContent: "center",
          alignItems: "center",
          padding: scaleW(16),
        },
        previewImage: {
          width: "100%",
          height: "100%",
          borderRadius: scaleW(16),
        },
        previewClose: {
          width: scaleW(56),
          height: scaleW(56),
          borderRadius: scaleW(28),
          backgroundColor: "rgba(255,255,255,0.16)",
          alignItems: "center",
          justifyContent: "center",
        },
        previewCloseWrap: {
          position: "absolute" as const,
          left: 0,
          right: 0,
          bottom: scaleW(28),
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
          elevation: 2,
          pointerEvents: "box-none" as const,
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

          {trackedMeta ? (
            <>
              <ThemedText style={styles.title} numberOfLines={2}>
                {trackedMeta.type === "cycle" ? "Cycle" : "Walk"}
              </ThemedText>
              <View style={styles.walkStatsRow}>
                <View style={styles.walkStatChip}>
                  <ThemedText style={styles.walkStatLabel}>Distance</ThemedText>
                  <ThemedText style={styles.walkStatValue}>{formatDistance(trackedMeta.distanceMeters)}</ThemedText>
                </View>
                <View style={styles.walkStatChip}>
                  <ThemedText style={styles.walkStatLabel}>Time</ThemedText>
                  <ThemedText style={styles.walkStatValue}>{formatDurationMs(trackedDurationMs)}</ThemedText>
                </View>
                {"steps" in trackedMeta && (
                  <View style={styles.walkStatChip}>
                    <ThemedText style={styles.walkStatLabel}>Steps</ThemedText>
                    <ThemedText style={styles.walkStatValue}>
                      {trackedMeta.steps == null ? "—" : `${trackedMeta.steps}`}
                    </ThemedText>
                  </View>
                )}
              </View>
              {trackedRegion && trackedMeta.route.length >= 2 && (
                <View style={styles.walkMapWrap}>
                  <MapView
                    style={styles.walkMap}
                    initialRegion={trackedRegion}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    pointerEvents="none"
                  >
                    <Polyline coordinates={trackedMeta.route} strokeColor="#2D5A27" strokeWidth={5} />
                  </MapView>
                </View>
              )}
              {trackedMeta.selectedProfiles.length > 0 && (
                <View style={styles.chipRow}>
                  {trackedMeta.selectedProfiles.slice(0, 6).map((p) => (
                    <View key={p.id} style={styles.chip}>
                      <ThemedText style={styles.chipText}>{p.nickname || "Explorer"}</ThemedText>
                    </View>
                  ))}
                </View>
              )}
              {trackedMeta.photoUrls.length > 0 && (
                <View style={styles.walkPhotoRow}>
                  {trackedMeta.photoUrls.slice(0, 4).map((url) => (
                    <Pressable
                      key={url}
                      onPress={() => setPreviewUri(url)}
                      accessibilityRole="button"
                      accessibilityLabel="View photo"
                    >
                      <Image source={{ uri: url }} style={styles.walkPhoto} resizeMode="cover" />
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : (
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
                <Pressable
                  onPress={() => setPreviewUri(entry.photo_url!)}
                  accessibilityRole="button"
                  accessibilityLabel="View photo"
                >
                  <Image source={{ uri: entry.photo_url }} style={styles.thumbnail} resizeMode="cover" />
                </Pressable>
              )}
            </View>
          )}

          <View style={styles.footer}>
            <ThemedText style={styles.byText}>
              {!trackedMeta && nickname ? `by ${nickname}` : ""}
            </ThemedText>
            <View style={styles.xpRow}>
              <MaterialIcons name="star" size={scaleW(14)} color={AMBER} />
              <ThemedText style={styles.xpText}>+5 XP</ThemedText>
            </View>
          </View>
        </View>
      </Pressable>

      <Modal
        visible={previewUri != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <Pressable style={styles.previewBackdrop} onPress={() => setPreviewUri(null)}>
          {previewUri != null && (
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
          )}
          <View style={styles.previewCloseWrap}>
            <Pressable
              style={styles.previewClose}
              onPress={() => setPreviewUri(null)}
              accessibilityRole="button"
              accessibilityLabel="Close photo preview"
            >
              <MaterialIcons name="close" size={scaleW(26)} color="#FFF" />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}
