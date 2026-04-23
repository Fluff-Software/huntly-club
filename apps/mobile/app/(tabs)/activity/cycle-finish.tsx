import React, { useMemo, useState } from "react";
import { BackHandler, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { clearCycleDraft, getCurrentCycleSession, updateCurrentCycleSession } from "../../../services/cycleSessionService";
import { createCycleJournalEntry } from "@/services/journalService";

const FOREST_DARK = "#2D4A35";
const LIGHT_GREEN_BG = "#EEF5EE";
const CARD_BG = "#FFF";
const CARD_CHECKED_BG = "#D8EDD8";
const HUNTLY_GREEN = "#4F6F52";
const CHECK_GREEN = "#2D5A27";

export default function CycleFinishScreen() {
  const router = useRouter();
  const { scaleW, isTablet } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const { profiles } = usePlayer();
  const { user } = useAuth();
  const { teamId } = useUser();

  const session = getCurrentCycleSession();
  const [selectedProfileIds, setSelectedProfileIds] = useState<number[]>(
    session?.selectedProfileIds ?? (profiles.length === 1 ? [profiles[0]!.id] : [])
  );
  const [photoUris, setPhotoUris] = useState<string[]>(session?.photoUris ?? []);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
      return () => sub.remove();
    }, [])
  );

  const toggleProfile = (id: number) => {
    setSelectedProfileIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.concat(id)));
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) setPhotoUris((prev) => prev.concat(result.assets[0]!.uri));
  };

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUris((prev) => prev.concat(result.assets.map((a) => a.uri).filter(Boolean)));
    }
  };

  const removePhoto = (uri: string) => setPhotoUris((prev) => prev.filter((u) => u !== uri));

  const canContinue = selectedProfileIds.length > 0 && !saving;

  const entryDate = useMemo(() => {
    const d = session?.endedAt ? new Date(session.endedAt) : new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, [session?.endedAt]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: FOREST_DARK },
        header: {
          backgroundColor: FOREST_DARK,
          paddingTop: scaleW(24),
          paddingBottom: scaleW(18),
          paddingHorizontal: scaleW(16),
          borderBottomLeftRadius: scaleW(28),
          borderBottomRightRadius: scaleW(28),
          flexDirection: "row",
          alignItems: "center",
        },
        headerRightSpacer: { width: scaleW(42) },
        headerTextWrap: { flex: 1, alignItems: "center" },
        headerTitle: { fontSize: scaleW(22), fontWeight: "700", color: "#FFF", textAlign: "center" },
        headerSubtext: { marginTop: scaleW(4), fontSize: scaleW(14), color: "rgba(255,255,255,0.75)", textAlign: "center" },
        body: { flex: 1, backgroundColor: LIGHT_GREEN_BG },
        scroll: { flex: 1 },
        scrollContent: { padding: scaleW(16), paddingBottom: scaleW(160) },
        sectionTitle: { fontSize: scaleW(16), fontWeight: "900", color: "#1A2E1E", marginBottom: scaleW(10) },
        card: {
          backgroundColor: CARD_BG,
          borderRadius: scaleW(16),
          padding: scaleW(18),
          marginBottom: scaleW(10),
          flexDirection: "row",
          alignItems: "center",
          gap: scaleW(14),
          shadowColor: "#2D4A35",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
        },
        cardChecked: { backgroundColor: CARD_CHECKED_BG },
        checkbox: {
          width: scaleW(28),
          height: scaleW(28),
          borderRadius: scaleW(14),
          borderWidth: 2,
          borderColor: HUNTLY_GREEN,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        },
        checkboxChecked: { backgroundColor: CHECK_GREEN, borderColor: CHECK_GREEN },
        cardTitle: { fontSize: scaleW(16), fontWeight: "800", color: "#1A2E1E" },
        cardSub: { marginTop: 2, fontSize: scaleW(13), color: "rgba(26,46,30,0.7)", fontWeight: "700" as const },
        footer: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: scaleW(12),
          paddingHorizontal: scaleW(20),
          paddingBottom: insets.bottom + scaleW(12) + (isTablet ? scaleW(40) : 0),
          backgroundColor: LIGHT_GREEN_BG,
          borderTopWidth: 1,
          borderTopColor: "rgba(79,111,82,0.1)",
        },
        footerHint: { fontSize: scaleW(14), color: "#5a5a5a", textAlign: "center", marginBottom: scaleW(12) },
        primaryButton: {
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(28),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(32),
          alignSelf: "stretch",
          alignItems: "center",
          opacity: canContinue ? 1 : 0.6,
        },
        primaryButtonText: { fontSize: scaleW(18), fontWeight: "800", color: "#FFF" },
        photoRow: { flexDirection: "row", gap: scaleW(10), marginBottom: scaleW(12) },
        photoBtn: {
          flex: 1,
          backgroundColor: CARD_BG,
          borderRadius: scaleW(16),
          paddingVertical: scaleW(14),
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: scaleW(8),
          shadowColor: "#2D4A35",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
        },
        photoBtnText: { fontSize: scaleW(14), fontWeight: "900", color: "#1A2E1E" },
        photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: scaleW(10) },
        photoThumbWrap: { position: "relative" as const },
        photoThumb: { width: scaleW(92), height: scaleW(92), borderRadius: scaleW(14), backgroundColor: "#E6E6E6" },
        removePhoto: {
          position: "absolute" as const,
          top: -scaleW(8),
          right: -scaleW(8),
          width: scaleW(26),
          height: scaleW(26),
          borderRadius: scaleW(13),
          backgroundColor: "#FFF",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: scaleW(3),
          elevation: 2,
        },
      }),
    [scaleW, insets.bottom, isTablet, canContinue]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.headerRightSpacer} />
        <View style={styles.headerTextWrap}>
          <ThemedText type="heading" style={styles.headerTitle}>
            Finish your cycle
          </ThemedText>
          <ThemedText style={styles.headerSubtext}>Who was involved? Add any photos.</ThemedText>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.body}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
          <ThemedText type="heading" style={styles.sectionTitle}>
            Explorers
          </ThemedText>

          {profiles.map((p) => {
            const checked = selectedProfileIds.includes(p.id);
            return (
              <Pressable key={p.id} style={[styles.card, checked && styles.cardChecked]} onPress={() => toggleProfile(p.id)}>
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <MaterialIcons name="check" size={scaleW(16)} color="#FFF" />}
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="heading" style={styles.cardTitle}>
                    {p.nickname || "Explorer"}
                  </ThemedText>
                  <ThemedText style={styles.cardSub}>{p.name ?? ""}</ThemedText>
                </View>
              </Pressable>
            );
          })}

          <View style={{ height: scaleW(8) }} />

          <ThemedText type="heading" style={styles.sectionTitle}>
            Photos (optional)
          </ThemedText>

          <View style={styles.photoRow}>
            <Pressable style={styles.photoBtn} onPress={takePhoto}>
              <MaterialIcons name="camera-alt" size={scaleW(18)} color="#1A2E1E" />
              <ThemedText style={styles.photoBtnText}>Camera</ThemedText>
            </Pressable>
            <Pressable style={styles.photoBtn} onPress={pickPhotos}>
              <MaterialIcons name="photo-library" size={scaleW(18)} color="#1A2E1E" />
              <ThemedText style={styles.photoBtnText}>Gallery</ThemedText>
            </Pressable>
          </View>

          {photoUris.length > 0 && (
            <View style={styles.photoGrid}>
              {photoUris.map((uri) => (
                <View key={uri} style={styles.photoThumbWrap}>
                  <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                  <Pressable style={styles.removePhoto} onPress={() => removePhoto(uri)}>
                    <MaterialIcons name="close" size={scaleW(16)} color="rgba(0,0,0,0.6)" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer} pointerEvents="box-none">
          <ThemedText style={styles.footerHint}>
            {canContinue ? "Nice — let’s save your summary." : "Pick at least one explorer to continue."}
          </ThemedText>
          <Pressable
            style={styles.primaryButton}
            disabled={!canContinue}
            onPress={async () => {
              if (!session || !user?.id || teamId == null) {
                updateCurrentCycleSession({ selectedProfileIds, photoUris });
                clearCycleDraft();
                router.replace("/(tabs)/activity/cycle-summary");
                return;
              }
              setSaving(true);
              try {
                updateCurrentCycleSession({ selectedProfileIds, photoUris });
                await createCycleJournalEntry({
                  userId: user.id,
                  teamId,
                  profileId: selectedProfileIds[0]!,
                  entryDate,
                  startedAt: session.startedAt,
                  endedAt: session.endedAt,
                  distanceMeters: session.distanceMeters,
                  route: session.route,
                  selectedProfiles: selectedProfileIds.map((id) => {
                    const p = profiles.find((x) => x.id === id);
                    return { id, nickname: (p?.nickname || p?.name || "Explorer").trim() };
                  }),
                  photoLocalUris: photoUris,
                });
              } finally {
                clearCycleDraft();
                setSaving(false);
                router.replace("/(tabs)/activity/cycle-summary");
              }
            }}
          >
            <ThemedText type="heading" style={styles.primaryButtonText}>
              {saving ? "Saving…" : "Continue"}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

