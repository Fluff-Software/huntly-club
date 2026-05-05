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
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  getRandomMissionPhotoGroups,
  type MissionPhotoGroup,
} from "@/services/activityProgressService";

const FOREST_DARK = "#2D4A35";
const HUNTLY_GREEN = "#4F6F52";

type GalleryPhoto = { uri: string; groupIndex: number; photoIndex: number };

export default function MissionGalleryScreen() {
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const { profiles } = usePlayer();
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

  const flatPhotos = useMemo(() => {
    const out: GalleryPhoto[] = [];
    groups.forEach((g, groupIndex) => {
      g.photos.forEach((uri, photoIndex) => {
        out.push({ uri, groupIndex, photoIndex });
      });
    });
    return out;
  }, [groups]);

  const openViewer = (groupIndex: number, photoIndex: number) => {
    const startIndex = flatPhotos.findIndex(
      (p) => p.groupIndex === groupIndex && p.photoIndex === photoIndex
    );
    setViewerPhotos(flatPhotos);
    setViewerIndex(Math.max(0, startIndex));
    setViewerOpen(true);
  };

  const closeViewer = () => setViewerOpen(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: FOREST_DARK },
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
          color: "#FFF",
        },
        headerBtn: {
          width: scaleW(40),
          height: scaleW(40),
          borderRadius: scaleW(20),
          backgroundColor: "rgba(255,255,255,0.12)",
          alignItems: "center",
          justifyContent: "center",
        },
        scroll: { flex: 1, paddingHorizontal: scaleW(18) },
        introCard: {
          backgroundColor: "rgba(255,255,255,0.10)",
          borderRadius: scaleW(16),
          padding: scaleW(14),
          marginBottom: scaleW(14),
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
        },
        introTitle: {
          fontSize: scaleW(18),
          fontWeight: "800",
          color: "#FFF",
          textAlign: "center",
          marginBottom: scaleW(6),
        },
        introSubtitle: {
          fontSize: scaleW(13),
          color: "rgba(255,255,255,0.85)",
          textAlign: "center",
          lineHeight: scaleW(18),
        },
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
        groupCard: {
          backgroundColor: "#FFF",
          borderRadius: scaleW(16),
          overflow: "hidden",
          marginBottom: scaleW(14),
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.9)",
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        groupHeader: {
          paddingHorizontal: scaleW(14),
          paddingVertical: scaleW(12),
          borderBottomWidth: 1,
          borderBottomColor: "rgba(0,0,0,0.06)",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: scaleW(10),
        },
        groupHeaderTitle: {
          fontSize: scaleW(14),
          fontWeight: "800",
          color: "#1a1a1a",
          flex: 1,
        },
        groupHeaderMeta: {
          fontSize: scaleW(12),
          fontWeight: "700",
          color: "#2D5A27",
        },
        photoRow: {
          flexDirection: "row",
          gap: scaleW(8),
          paddingHorizontal: scaleW(12),
          paddingVertical: scaleW(12),
        },
        photoTile: {
          flex: 1,
          aspectRatio: 1,
          borderRadius: scaleW(12),
          overflow: "hidden",
          backgroundColor: "#EEE",
        },
        photo: { width: "100%", height: "100%" },
        emptyWrap: {
          paddingVertical: scaleW(36),
          paddingHorizontal: scaleW(24),
          alignItems: "center",
          gap: scaleW(10),
        },
        emptyTitle: {
          color: "#FFF",
          fontSize: scaleW(18),
          fontWeight: "800",
          textAlign: "center",
        },
        emptyText: {
          color: "rgba(255,255,255,0.85)",
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
  const viewerPadding = scaleW(16) * 2;
  const viewerWidth = screenWidth - viewerPadding;
  const viewerHeight = screenHeight - viewerPadding;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={scaleW(20)} color="#FFF" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Mission Gallery</ThemedText>
        <View style={{ width: scaleW(40), height: scaleW(40) }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: scaleW(24) }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.introCard}>
          <ThemedText type="heading" style={styles.introTitle}>
            See how others did
          </ThemedText>
          <ThemedText style={styles.introSubtitle}>
            These are approved photos from other explorers who completed this mission.
          </ThemedText>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#FFF" />
            <ThemedText style={{ color: "rgba(255,255,255,0.9)", fontWeight: "700" }}>
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
            const meta = team ? `${author} • ${team}` : author;
            const topPhotos = g.photos.slice(0, 3);

            return (
              <View key={`${g.user_activity_id}-${groupIndex}`} style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <ThemedText style={styles.groupHeaderTitle} numberOfLines={1}>
                    {meta}
                  </ThemedText>
                  <ThemedText style={styles.groupHeaderMeta}>
                    {g.photos.length} photo{g.photos.length === 1 ? "" : "s"}
                  </ThemedText>
                </View>
                <View style={styles.photoRow}>
                  {topPhotos.map((uri, photoIndex) => (
                    <Pressable
                      key={`${uri}-${photoIndex}`}
                      style={styles.photoTile}
                      onPress={() => openViewer(groupIndex, photoIndex)}
                    >
                      <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                    </Pressable>
                  ))}
                  {topPhotos.length < 3 &&
                    Array.from({ length: 3 - topPhotos.length }).map((_, i) => (
                      <View key={`empty-${i}`} style={styles.photoTile} />
                    ))}
                </View>
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
            initialScrollIndex={Math.min(viewerIndex, Math.max(0, viewerPhotos.length - 1))}
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

