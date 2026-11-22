import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  ScrollView,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { FKButton } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
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

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

function formatDisplayDate(iso: string): string {
  const today = todayISODate();
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

interface AddJournalEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (entry: JournalEntry) => void;
  initialActivityTag?: ActivityTag;
}

export function AddJournalEntryModal({ visible, onClose, onSuccess, initialActivityTag }: AddJournalEntryModalProps) {
  const { user } = useAuth();
  const { profiles } = usePlayer();
  const { teamId } = useUser();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [activityTag, setActivityTag] = useState<ActivityTag>("Walk");
  const [entryDate, setEntryDate] = useState(todayISODate);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
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
        Alert.alert("Camera access", "Please allow camera access in your settings to take photos.");
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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Photo access", "Please allow photo library access in your settings.");
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
      Alert.alert("Add a title", "Give this adventure a name first.");
      return;
    }
    if (!selectedProfileId) {
      Alert.alert("Choose an explorer", "Pick whose adventure this is.");
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
      Alert.alert("That didn't save", "Something went wrong saving your adventure. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [title, selectedProfileId, user?.id, teamId, notes, photoUri, activityTag, entryDate, onSuccess, onClose]);

  const canSave = title.trim().length > 0 && selectedProfileId != null && teamId != null && !saving;
  const nextIsFuture = isDateInFuture(addDays(entryDate, 1));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
          <View style={styles.sheet}>
            <View style={styles.sheetTop}>
              <Text style={TYPE.title}>Add an adventure</Text>
              <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={FK.ink} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {profiles.length > 1 ? (
                <>
                  <Text style={styles.label}>Whose adventure is it?</Text>
                  <View style={styles.chipRow}>
                    {profiles.map((profile) => {
                      const active = selectedProfileId === profile.id;
                      return (
                        <Pressable
                          key={profile.id}
                          style={active ? [styles.chip, styles.chipActive] : styles.chip}
                          onPress={() => setSelectedProfileId(profile.id)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                        >
                          <Text style={active ? [styles.chipText, { color: FK.white }] : styles.chipText}>
                            {profile.name || profile.nickname}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <Text style={styles.label}>What did you do?</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Built a den in the woods"
                placeholderTextColor={FK.muted}
                maxLength={80}
                returnKeyType="next"
              />

              <Text style={styles.label}>What kind of adventure?</Text>
              <View style={styles.chipRow}>
                {ACTIVITY_TAGS.map((tag) => {
                  const active = activityTag === tag;
                  return (
                    <Pressable
                      key={tag}
                      style={active ? [styles.chip, styles.chipActive] : styles.chip}
                      onPress={() => setActivityTag(tag)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={active ? [styles.chipText, { color: FK.white }] : styles.chipText}>{tag}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>When?</Text>
              <View style={styles.dateRow}>
                <Pressable
                  style={styles.dateArrow}
                  onPress={() => setEntryDate((d) => addDays(d, -1))}
                  accessibilityRole="button"
                  accessibilityLabel="Day before"
                >
                  <Ionicons name="chevron-back" size={22} color={FK.ink} />
                </Pressable>
                <Text style={styles.dateText}>{formatDisplayDate(entryDate)}</Text>
                <Pressable
                  style={nextIsFuture ? [styles.dateArrow, { opacity: 0.35 }] : styles.dateArrow}
                  onPress={() => {
                    if (!nextIsFuture) setEntryDate((d) => addDays(d, 1));
                  }}
                  disabled={nextIsFuture}
                  accessibilityRole="button"
                  accessibilityLabel="Day after"
                >
                  <Ionicons name="chevron-forward" size={22} color={FK.ink} />
                </Pressable>
              </View>

              <Text style={styles.label}>Anything to remember? (optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="What did you see or find?"
                placeholderTextColor={FK.muted}
                multiline
                maxLength={500}
              />

              <Text style={styles.label}>Photo (optional)</Text>
              {!photoUri ? (
                <View style={styles.photoButtons}>
                  <Pressable style={styles.photoBtn} onPress={handleTakePhoto} accessibilityRole="button">
                    <Ionicons name="camera-outline" size={20} color={FK.ink} />
                    <Text style={styles.photoBtnText}>Take one</Text>
                  </Pressable>
                  <Pressable style={styles.photoBtn} onPress={handlePickPhoto} accessibilityRole="button">
                    <Ionicons name="images-outline" size={20} color={FK.ink} />
                    <Text style={styles.photoBtnText}>Choose one</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.thumbWrap}>
                  <Image source={{ uri: photoUri }} style={styles.thumb} resizeMode="cover" />
                  <Pressable
                    style={styles.removeThumb}
                    onPress={() => setPhotoUri(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo"
                  >
                    <Ionicons name="close" size={16} color={FK.ink} />
                  </Pressable>
                </View>
              )}

              <FKButton
                label="Save to journal"
                icon="checkmark"
                onPress={handleSave}
                disabled={!canSave}
                loading={saving}
                style={{ marginTop: 26 }}
              />
              <Text style={styles.xpNote}>Adds {JOURNAL_XP_PER_ENTRY} XP</Text>
              <FKButton label="Cancel" variant="link" onPress={onClose} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(16,37,27,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: FK.paper,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingTop: 18,
    maxHeight: "92%",
  },
  sheetTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: FK.moss,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  label: { fontFamily: FONT.display, fontSize: 16, color: FK.ink, marginTop: 18, marginBottom: 8 },
  input: {
    backgroundColor: FK.moss,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: FK.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONT.body,
    fontSize: 17,
    color: FK.ink,
  },
  notesInput: { minHeight: 96, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: FK.moss,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: FK.line,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minHeight: 42,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: FK.ink, borderColor: FK.ink },
  chipText: { fontFamily: FONT.displayBold, fontSize: 15, color: FK.ink },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FK.moss,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: FK.line,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  dateText: { flex: 1, textAlign: "center", fontFamily: FONT.displayBold, fontSize: 17, color: FK.ink },
  dateArrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  photoButtons: { flexDirection: "row", gap: 10 },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: FK.moss,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: FK.line,
    paddingVertical: 14,
  },
  photoBtnText: { fontFamily: FONT.displayBold, fontSize: 15, color: FK.ink },
  thumbWrap: { alignSelf: "flex-start", position: "relative" },
  thumb: { width: 96, height: 96, borderRadius: RADIUS.sm },
  removeThumb: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: FK.paper,
    borderWidth: 1.5,
    borderColor: FK.line,
    alignItems: "center",
    justifyContent: "center",
  },
  xpNote: { fontFamily: FONT.bodyBold, fontSize: 14, color: FK.muted, textAlign: "center", marginTop: 8 },
});
