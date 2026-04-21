import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Modal,
  View,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUser } from "@/contexts/UserContext";
import {
  ACTIVITY_TAGS,
  JOURNAL_XP_PER_ENTRY,
  createJournalEntry,
  type ActivityTag,
  type JournalEntry,
} from "@/services/journalService";

const PARCHMENT = "#FFFDF7";
const PARCHMENT_BORDER = "#D9C9A3";
const AMBER = "#B07D3E";
const CHARCOAL = "#3D3D3D";
const MUTED = "#8A8A8A";
const HUNTLY_GREEN = "#4F6F52";
const CREAM = "#F4F0EB";

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  }
  return iso;
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isDateInFuture(iso: string): boolean {
  return iso > todayISODate();
}

interface AddJournalEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (entry: JournalEntry) => void;
  initialActivityTag?: ActivityTag;
}

export function AddJournalEntryModal({
  visible,
  onClose,
  onSuccess,
  initialActivityTag,
}: AddJournalEntryModalProps) {
  const { scaleW } = useLayoutScale();
  const { user } = useAuth();
  const { profiles } = usePlayer();
  const { teamId } = useUser();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [activityTag, setActivityTag] = useState<ActivityTag>("Walk");
  const [entryDate, setEntryDate] = useState(todayISODate);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(
    null
  );
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-select the only profile when just one exists
  useEffect(() => {
    if (profiles.length === 1) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles]);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setTitle("");
      setNotes("");
      setActivityTag(initialActivityTag ?? "Walk");
      setEntryDate(todayISODate());
      setPhotoUri(null);
      setSaving(false);
      if (profiles.length === 1) {
        setSelectedProfileId(profiles[0].id);
      } else {
        setSelectedProfileId(null);
      }
    }
  }, [visible, profiles, initialActivityTag]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera access",
          "Please allow camera access in your settings to take photos."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  }, []);

  const handlePickPhoto = useCallback(async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Gallery access",
          "Please allow photo library access in your settings."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Gallery error:", err);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Please give this adventure a title.");
      return;
    }
    if (!selectedProfileId) {
      Alert.alert(
        "Choose an explorer",
        "Select which explorer is logging this adventure."
      );
      return;
    }
    if (!user?.id || teamId == null) return;

    setSaving(true);
    try {
      const entry = await createJournalEntry({
        userId: user.id,
        profileId: selectedProfileId,
        teamId,
        title: title.trim(),
        notes: notes.trim() || undefined,
        photoLocalUri: photoUri ?? undefined,
        activityTag,
        entryDate,
      });
      onSuccess(entry);
      onClose();
    } catch (err) {
      console.error("Error saving journal entry:", err);
      Alert.alert(
        "Oops!",
        "Something went wrong saving your adventure. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }, [
    title,
    selectedProfileId,
    user?.id,
    teamId,
    notes,
    photoUri,
    activityTag,
    entryDate,
    onSuccess,
    onClose,
  ]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "flex-end",
        },
        sheet: {
          backgroundColor: PARCHMENT,
          borderTopLeftRadius: scaleW(24),
          borderTopRightRadius: scaleW(24),
          paddingTop: scaleW(12),
          maxHeight: "92%",
        },
        dragIndicator: {
          width: scaleW(40),
          height: scaleW(4),
          backgroundColor: PARCHMENT_BORDER,
          borderRadius: scaleW(2),
          alignSelf: "center",
          marginBottom: scaleW(16),
        },
        scrollContent: {
          paddingHorizontal: scaleW(20),
          paddingBottom: scaleW(40),
        },
        sheetTitle: {
          fontSize: scaleW(20),
          fontWeight: "700",
          color: CHARCOAL,
          marginBottom: scaleW(20),
          textAlign: "center",
        },
        sectionLabel: {
          fontSize: scaleW(13),
          fontWeight: "600",
          color: MUTED,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: scaleW(8),
          marginTop: scaleW(16),
        },
        textInput: {
          backgroundColor: "#FFF",
          borderRadius: scaleW(10),
          borderWidth: 1,
          borderColor: PARCHMENT_BORDER,
          paddingHorizontal: scaleW(14),
          paddingVertical: scaleW(12),
          fontSize: scaleW(15),
          color: CHARCOAL,
        },
        notesInput: {
          minHeight: scaleW(80),
          textAlignVertical: "top",
        },
        tagRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: scaleW(8),
        },
        tagChip: {
          borderRadius: scaleW(20),
          paddingHorizontal: scaleW(14),
          paddingVertical: scaleW(8),
          borderWidth: 1.5,
        },
        tagChipActive: {
          backgroundColor: AMBER,
          borderColor: AMBER,
        },
        tagChipInactive: {
          backgroundColor: "#FFF",
          borderColor: PARCHMENT_BORDER,
        },
        tagChipText: {
          fontSize: scaleW(13),
          fontWeight: "600",
        },
        tagChipTextActive: {
          color: "#FFF",
        },
        tagChipTextInactive: {
          color: CHARCOAL,
        },
        dateRow: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#FFF",
          borderRadius: scaleW(10),
          borderWidth: 1,
          borderColor: PARCHMENT_BORDER,
          paddingHorizontal: scaleW(12),
          paddingVertical: scaleW(10),
        },
        dateText: {
          flex: 1,
          textAlign: "center",
          fontSize: scaleW(15),
          color: CHARCOAL,
          fontWeight: "600",
        },
        dateArrow: {
          padding: scaleW(4),
        },
        profileRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: scaleW(8),
        },
        profileChip: {
          borderRadius: scaleW(20),
          paddingHorizontal: scaleW(14),
          paddingVertical: scaleW(8),
          borderWidth: 1.5,
        },
        profileChipActive: {
          backgroundColor: HUNTLY_GREEN,
          borderColor: HUNTLY_GREEN,
        },
        profileChipInactive: {
          backgroundColor: "#FFF",
          borderColor: PARCHMENT_BORDER,
        },
        profileChipText: {
          fontSize: scaleW(13),
          fontWeight: "600",
        },
        profileChipTextActive: {
          color: "#FFF",
        },
        profileChipTextInactive: {
          color: CHARCOAL,
        },
        photoButtons: {
          flexDirection: "row",
          gap: scaleW(10),
        },
        photoBtn: {
          flex: 1,
          backgroundColor: "#FFF",
          borderRadius: scaleW(10),
          borderWidth: 1,
          borderColor: PARCHMENT_BORDER,
          paddingVertical: scaleW(12),
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: scaleW(6),
        },
        photoBtnText: {
          fontSize: scaleW(13),
          color: CHARCOAL,
          fontWeight: "600",
        },
        thumbnailContainer: {
          marginTop: scaleW(10),
          position: "relative",
          alignSelf: "flex-start",
        },
        thumbnail: {
          width: scaleW(88),
          height: scaleW(88),
          borderRadius: scaleW(10),
        },
        removeThumbnail: {
          position: "absolute",
          top: -scaleW(8),
          right: -scaleW(8),
          backgroundColor: "#FFF",
          borderRadius: scaleW(12),
          width: scaleW(24),
          height: scaleW(24),
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: scaleW(3),
          elevation: 2,
        },
        saveButton: {
          backgroundColor: AMBER,
          borderRadius: scaleW(28),
          paddingVertical: scaleW(16),
          alignItems: "center",
          marginTop: scaleW(24),
        },
        saveButtonDisabled: {
          opacity: 0.6,
        },
        saveButtonText: {
          fontSize: scaleW(16),
          fontWeight: "700",
          color: "#FFF",
        },
        cancelButton: {
          paddingVertical: scaleW(12),
          alignItems: "center",
          marginTop: scaleW(8),
        },
        cancelButtonText: {
          fontSize: scaleW(15),
          color: MUTED,
        },
        xpNote: {
          fontSize: scaleW(12),
          color: AMBER,
          textAlign: "center",
          marginTop: scaleW(6),
        },
      }),
    [scaleW]
  );

  const canSave =
    title.trim().length > 0 &&
    selectedProfileId != null &&
    teamId != null &&
    !saving;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%" }}
        >
          <View style={styles.sheet}>
            <View style={styles.dragIndicator} />
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <ThemedText style={styles.sheetTitle}>
                Add an adventure
              </ThemedText>

              {/* Profile selector — only if multiple profiles */}
              {profiles.length > 1 && (
                <>
                  <ThemedText style={styles.sectionLabel}>
                    Who's logging this?
                  </ThemedText>
                  <View style={styles.profileRow}>
                    {profiles.map((profile) => {
                      const isActive = selectedProfileId === profile.id;
                      return (
                        <Pressable
                          key={profile.id}
                          style={[
                            styles.profileChip,
                            isActive
                              ? styles.profileChipActive
                              : styles.profileChipInactive,
                          ]}
                          onPress={() => setSelectedProfileId(profile.id)}
                        >
                          <ThemedText
                            style={[
                              styles.profileChipText,
                              isActive
                                ? styles.profileChipTextActive
                                : styles.profileChipTextInactive,
                            ]}
                          >
                            {profile.nickname}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Title */}
              <ThemedText style={styles.sectionLabel}>
                Adventure title *
              </ThemedText>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Den in the woods"
                placeholderTextColor={MUTED}
                maxLength={80}
                returnKeyType="next"
              />

              {/* Activity tag */}
              <ThemedText style={styles.sectionLabel}>Activity type</ThemedText>
              <View style={styles.tagRow}>
                {ACTIVITY_TAGS.map((tag) => {
                  const isActive = activityTag === tag;
                  return (
                    <Pressable
                      key={tag}
                      style={[
                        styles.tagChip,
                        isActive ? styles.tagChipActive : styles.tagChipInactive,
                      ]}
                      onPress={() => setActivityTag(tag)}
                    >
                      <ThemedText
                        style={[
                          styles.tagChipText,
                          isActive
                            ? styles.tagChipTextActive
                            : styles.tagChipTextInactive,
                        ]}
                      >
                        {tag}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {/* Date */}
              <ThemedText style={styles.sectionLabel}>Date</ThemedText>
              <View style={styles.dateRow}>
                <Pressable
                  style={styles.dateArrow}
                  onPress={() => setEntryDate((d) => addDays(d, -1))}
                >
                  <MaterialIcons
                    name="chevron-left"
                    size={scaleW(24)}
                    color={CHARCOAL}
                  />
                </Pressable>
                <ThemedText style={styles.dateText}>
                  {formatDisplayDate(entryDate)}
                </ThemedText>
                <Pressable
                  style={styles.dateArrow}
                  onPress={() => {
                    if (!isDateInFuture(addDays(entryDate, 1))) {
                      setEntryDate((d) => addDays(d, 1));
                    }
                  }}
                  disabled={isDateInFuture(addDays(entryDate, 1))}
                >
                  <MaterialIcons
                    name="chevron-right"
                    size={scaleW(24)}
                    color={
                      isDateInFuture(addDays(entryDate, 1)) ? MUTED : CHARCOAL
                    }
                  />
                </Pressable>
              </View>

              {/* Notes */}
              <ThemedText style={styles.sectionLabel}>
                Notes (optional)
              </ThemedText>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="What happened? What did you find?"
                placeholderTextColor={MUTED}
                multiline
                maxLength={500}
              />

              {/* Photo */}
              <ThemedText style={styles.sectionLabel}>
                Photo (optional)
              </ThemedText>
              {!photoUri ? (
                <View style={styles.photoButtons}>
                  <Pressable style={styles.photoBtn} onPress={handleTakePhoto}>
                    <MaterialIcons
                      name="camera-alt"
                      size={scaleW(18)}
                      color={CHARCOAL}
                    />
                    <ThemedText style={styles.photoBtnText}>Camera</ThemedText>
                  </Pressable>
                  <Pressable style={styles.photoBtn} onPress={handlePickPhoto}>
                    <MaterialIcons
                      name="photo-library"
                      size={scaleW(18)}
                      color={CHARCOAL}
                    />
                    <ThemedText style={styles.photoBtnText}>Gallery</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.thumbnailContainer}>
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                  <Pressable
                    style={styles.removeThumbnail}
                    onPress={() => setPhotoUri(null)}
                  >
                    <MaterialIcons name="close" size={scaleW(16)} color={MUTED} />
                  </Pressable>
                </View>
              )}

              {/* Save */}
              <Pressable
                style={[
                  styles.saveButton,
                  !canSave && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!canSave}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <ThemedText style={styles.saveButtonText}>
                    Save adventure
                  </ThemedText>
                )}
              </Pressable>
              <ThemedText style={styles.xpNote}>
                +{JOURNAL_XP_PER_ENTRY} XP awarded on save
              </ThemedText>

              <Pressable style={styles.cancelButton} onPress={onClose}>
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
