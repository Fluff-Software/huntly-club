import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  getRandomMissionPhotoGroups,
  type MissionPhotoGroup,
} from "@/services/activityProgressService";
import { getTeamCardConfig } from "@/utils/teamUtils";

const PAGE_BG = "#F3F5F0";
const INK = "#1F2937";
const HUNTLY_GREEN = "#4F6F52";

type GalleryPhoto = { uri: string };

export default function MissionGalleryScreen() {
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const { profiles } = usePlayer();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ activityId?: string }>();

  const activityId = params.activityId ? Number(params.activityId) : null;
  const excludeProfileIds = useMemo(() => profiles.map((p) => p.id), [profiles]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<MissionPhotoGroup[]>([]);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<GalleryPhoto[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const load = useCallback(async () => {
    if (!activityId) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getRandomMissionPhotoGroups(
        activityId,
        excludeProfileIds,
        3
      );
      setGroups(result);
    } catch (e) {
      setGroups([]);
      setError(e instanceof Error ? e.message : "Failed to load mission gallery");
    } finally {
      setLoading(false);
    }
  }, [activityId, excludeProfileIds]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openViewer = (photos: string[], startIndex: number = 0) => {
    const list = photos.map((uri) => ({ uri }));
    setViewerPhotos(list);
    setViewerIndex(Math.max(0, Math.min(startIndex, Math.max(0, list.length - 1))));
    setViewerOpen(true);
  };

  const closeViewer = () => setViewerOpen(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: PAGE_BG },
        header: {
          paddingHorizontal: scaleW(16),
          paddingTop: scaleW(10),
          paddingBottom: scaleW(10),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        headerTitle: {
          fontSize: scaleW(16),
          fontWeight: "700",
          color: INK,
        },
        headerBtn: {
          width: scaleW(40),
          height: scaleW(40),
          borderRadius: scaleW(20),
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        scroll: { flex: 1, paddingHorizontal: scaleW(18) },
        loadingWrap: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: scaleW(48),
          gap: scaleW(10),
        },
        errorText: {
          color: "#FCA5A5",
          fontSize: scaleW(13),
          textAlign: "center",
        },
        retryBtn: {
          marginTop: scaleW(10),
          alignSelf: "center",
          paddingHorizontal: scaleW(14),
          paddingVertical: scaleW(10),
          borderRadius: scaleW(12),
          backgroundColor: HUNTLY_GREEN,
        },
        retryText: { color: "#FFF", fontWeight: "700", fontSize: scaleW(13) },
        groupWrap: {
          marginBottom: scaleW(32),
          backgroundColor: "#FFFFFF",
          borderRadius: scaleW(20),
          padding: scaleW(14),
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 2,
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.06)",
        },
        groupHeaderRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: scaleW(10),
          marginBottom: scaleW(10),
        },
        teamBadge: {
          width: scaleW(38),
          height: scaleW(38),
        },
        nicknameText: {
          color: INK,
          fontSize: scaleW(17),
          fontWeight: "800",
          flex: 1,
        },
        photoCountText: {
          color: "#6B7280",
          fontSize: scaleW(12),
          fontWeight: "800",
        },
        stackPressable: {
          width: "100%",
          aspectRatio: 5 / 4,
          borderRadius: scaleW(18),
          overflow: "visible",
        },
        stackInner: {
          flex: 1,
          padding: scaleW(16),
        },
        stackStage: {
          flex: 1,
          borderRadius: scaleW(18),
          position: "relative",
        },
        stackCard: {
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          borderRadius: scaleW(18),
          backgroundColor: "#FFF",
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.06)",
        },
        stackImage: { width: "100%", height: "100%" },
        emptyWrap: {
          paddingVertical: scaleW(36),
          paddingHorizontal: scaleW(24),
          alignItems: "center",
          gap: scaleW(10),
        },
        emptyTitle: {
          color: INK,
          fontSize: scaleW(18),
          fontWeight: "800",
          textAlign: "center",
        },
        emptyText: {
          color: "#4B5563",
          fontSize: scaleW(13),
          textAlign: "center",
          lineHeight: scaleW(18),
        },
        viewerOverlay: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.92)",
          justifyContent: "center",
          alignItems: "center",
        },
        viewerTopBar: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: scaleW(52),
          paddingHorizontal: scaleW(16),
          paddingBottom: scaleW(12),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        viewerBtn: {
          paddingVertical: scaleW(10),
          paddingHorizontal: scaleW(12),
          borderRadius: scaleW(10),
          backgroundColor: "rgba(255,255,255,0.12)",
          flexDirection: "row",
          alignItems: "center",
          gap: scaleW(8),
        },
        viewerBtnText: { color: "#FFF", fontWeight: "700", fontSize: scaleW(13) },
      }),
    [scaleW]
  );

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const viewerWidth = screenWidth;
  const viewerHeight = screenHeight;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={scaleW(20)} color={INK} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Mission Gallery</ThemedText>
        <View style={{ width: scaleW(40), height: scaleW(40) }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + scaleW(32) }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={HUNTLY_GREEN} />
            <ThemedText style={{ color: INK, fontWeight: "800" }}>
              Loading gallery…
            </ThemedText>
          </View>
        ) : error ? (
          <View style={styles.loadingWrap}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable style={styles.retryBtn} onPress={load}>
              <ThemedText style={styles.retryText}>Try again</ThemedText>
            </Pressable>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyWrap}>
            <ThemedText style={styles.emptyTitle}>Nothing yet</ThemedText>
            <ThemedText style={styles.emptyText}>
              There aren’t any approved photos from other explorers for this mission yet. Check back later.
            </ThemedText>
            <Pressable style={styles.retryBtn} onPress={load}>
              <ThemedText style={styles.retryText}>Refresh</ThemedText>
            </Pressable>
          </View>
        ) : (
          groups.map((g, groupIndex) => {
            const author = g.author?.trim() ? g.author.trim() : "Explorer";
            const team = g.team_name?.trim() ? g.team_name.trim() : null;
            const badge = getTeamCardConfig(team ?? undefined).badgeImage;
            const previewPhotos = g.photos.slice(0, 4);
            // Index 0 should be the front/top card (no rotation).
            const rotations = [0, -6, 4, -2];
            const offsets = [
              { x: 0, y: 0 },
              { x: -6, y: 6 },
              { x: 6, y: 4 },
              { x: -3, y: 2 },
            ];

            return (
              <View key={`${g.user_activity_id}-${groupIndex}`} style={styles.groupWrap}>
                <View style={styles.groupHeaderRow}>
                  <Image source={badge} style={styles.teamBadge} resizeMode="contain" />
                  <ThemedText style={styles.nicknameText} numberOfLines={1}>
                    {author}
                  </ThemedText>
                </View>

                <Pressable
                  style={styles.stackPressable}
                  onPress={() => openViewer(g.photos, 0)}
                  disabled={g.photos.length === 0}
                >
                  <View style={styles.stackInner}>
                    <View style={styles.stackStage}>
                      {previewPhotos.map((uri, i) => {
                        const rot = rotations[Math.min(i, rotations.length - 1)];
                        const off = offsets[Math.min(i, offsets.length - 1)];
                        // Front = first photo (i=0), back = last photo.
                        const zIndex = previewPhotos.length - i;
                        return (
                          <View
                            key={`${uri}-${i}`}
                            style={[
                              styles.stackCard,
                              {
                                zIndex,
                                transform: [
                                  { translateX: scaleW(off.x) },
                                  { translateY: scaleW(off.y) },
                                  { rotate: `${rot}deg` },
                                ],
                              },
                            ]}
                          >
                            <Image source={{ uri }} style={styles.stackImage} resizeMode="cover" />
                          </View>
                        );
                      })}
                      {previewPhotos.length === 0 ? (
                        <View style={[styles.stackCard, { justifyContent: "center", alignItems: "center" }]}>
                          <ThemedText style={{ color: "#374151", fontWeight: "700" }}>
                            No photos
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={viewerOpen}
        transparent
        animationType="fade"
        onRequestClose={closeViewer}
        supportedOrientations={["portrait", "landscape"]}
      >
        <View style={styles.viewerOverlay}>
          <FlatList
            data={viewerPhotos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={
              viewerPhotos.length > 0
                ? Math.min(viewerIndex, Math.max(0, viewerPhotos.length - 1))
                : undefined
            }
            getItemLayout={(_, index) => ({
              length: viewerWidth,
              offset: viewerWidth * index,
              index,
            })}
            keyExtractor={(p, i) => `${p.uri}-${i}`}
            renderItem={({ item }) => (
              <View style={{ width: viewerWidth, height: viewerHeight }}>
                <Image
                  source={{ uri: item.uri }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="contain"
                />
              </View>
            )}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / viewerWidth);
              setViewerIndex(Math.min(Math.max(idx, 0), Math.max(0, viewerPhotos.length - 1)));
            }}
            removeClippedSubviews={Platform.OS !== "android"}
          />

          <View style={styles.viewerTopBar} pointerEvents="box-none">
            <Pressable style={styles.viewerBtn} onPress={closeViewer}>
              <MaterialIcons name="close" size={scaleW(18)} color="#FFF" />
              <ThemedText style={styles.viewerBtnText}>Close</ThemedText>
            </Pressable>
            <ThemedText style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700" }}>
              {viewerPhotos.length > 0 ? viewerIndex + 1 : 0}/{viewerPhotos.length}
            </ThemedText>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

