import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { FKButton, FKChip, FKPageHeader, FKSkeleton } from "@/components/fieldkit";
import {
  DANGER,
  DangerButton,
  DialogCard,
  dialogStyles,
  LinkRow,
  RowGroup,
  SectionLabel,
} from "@/components/account/GrownUpRows";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { PROFILE_COLOR_OPTIONS, getTailwindColorHex } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useProfileDashboard } from "@/contexts/ProfileDashboardContext";
import { useNavigationReturn } from "@/contexts/NavigationReturnContext";
import { useTeamGuide } from "@/hooks/useTeamGuide";
import {
  createProfile,
  deleteProfile as deleteProfileService,
  updateProfile,
  type Profile,
} from "@/services/profileService";
import { generateNickname } from "@/services/nicknameGenerator";
import { familySentence } from "@/utils/familyNames";

const MAX_EXPLORERS = 6;
const SWATCHES = PROFILE_COLOR_OPTIONS.map((o) => ({ hex: getTailwindColorHex(o.value), label: o.label }));
const DEFAULT_COLOUR = SWATCHES[0]?.hex ?? "#FF6B35";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatDay(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function initialOf(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

/** Grown-up screen: every explorer as equals, the family's team, recent adventures and account actions. */
export default function ProfileScreen() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { profiles, refreshProfiles, loading: profilesLoading } = usePlayer();
  const { recentActivities, xpByProfileId, recentActivitiesLoading, refresh: refreshProfileDashboard } =
    useProfileDashboard();
  const { guide, loading: teamLoading } = useTeamGuide();
  const { pushWithReturn } = useNavigationReturn();

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [addNickname, setAddNickname] = useState(() => generateNickname());
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLOUR);
  // Edit form
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editColor, setEditColor] = useState<string>(DEFAULT_COLOUR);
  const [loading, setLoading] = useState(false);
  // Remove
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sortedProfiles = useMemo(
    () => [...profiles].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [profiles]
  );
  const names = sortedProfiles.map((p) => p.name);
  const canAdd = sortedProfiles.length < MAX_EXPLORERS;

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      let isMounted = true;
      const refresh = async () => {
        if (!isMounted) return;
        await refreshProfiles();
        if (isMounted) await refreshProfileDashboard();
      };
      void refresh();
      return () => {
        isMounted = false;
      };
    }, [refreshProfiles, refreshProfileDashboard])
  );

  const handleBack = () => (router.canGoBack() ? router.back() : router.navigate("/(tabs)/me"));

  const handleExpandEdit = (profile: Profile) => {
    if (editingProfileId === profile.id) {
      setEditingProfileId(null);
      return;
    }
    setShowAddForm(false);
    setEditingProfileId(profile.id);
    setEditName(profile.name);
    setEditNickname(profile.nickname || generateNickname());
    setEditColor(profile.colour || DEFAULT_COLOUR);
  };

  const handleSaveEdit = async () => {
    if (editingProfileId == null || !editName.trim() || !editNickname.trim()) {
      Alert.alert("Add a name", "Every explorer needs a name and a nickname.");
      return;
    }
    setLoading(true);
    try {
      await updateProfile(editingProfileId, {
        name: editName.trim(),
        nickname: editNickname.trim(),
        colour: editColor,
      });
      await refreshProfiles();
      setEditingProfileId(null);
    } catch (error) {
      Alert.alert("Couldn't save", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!profileToDelete) return;
    setDeleting(true);
    try {
      await deleteProfileService(profileToDelete.id);
      await refreshProfiles();
      if (editingProfileId === profileToDelete.id) setEditingProfileId(null);
      setProfileToDelete(null);
    } catch (err) {
      Alert.alert("Couldn't remove explorer", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const openAddForm = () => {
    setEditingProfileId(null);
    setName("");
    setAddNickname(generateNickname());
    setSelectedColor(SWATCHES[sortedProfiles.length % SWATCHES.length]?.hex ?? DEFAULT_COLOUR);
    setShowAddForm(true);
  };

  const handleAddExplorer = async () => {
    if (!name.trim() || !user) {
      Alert.alert("Add a name", "First names are perfect.");
      return;
    }
    setLoading(true);
    try {
      const added = name.trim();
      await createProfile({
        user_id: user.id,
        name: added,
        nickname: addNickname.trim() || generateNickname(),
        colour: selectedColor,
      });
      await refreshProfiles();
      setName("");
      setAddNickname(generateNickname());
      setShowAddForm(false);
      Alert.alert(`${added} has joined`, guide ? `${added} is on Team ${guide.teamName} with everyone else.` : undefined);
    } catch (error) {
      Alert.alert("Couldn't add explorer", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign out?", "You'll need your email and password to sign back in.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert("Couldn't sign out", "Please try again.");
          }
        },
      },
    ]);
  };

  if (!authLoading && !user) {
    return <Redirect href="/auth" />;
  }

  const showExplorerSkeleton = profilesLoading && sortedProfiles.length === 0;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FKPageHeader eyebrow="For grown-ups" title="Explorers & account" onBack={handleBack} />
          {sortedProfiles.length > 0 ? (
            <Text style={styles.lead}>
              {familySentence(names)} {sortedProfiles.length === 1 ? "explores" : "explore"} on this account. Tap an
              explorer to change their name, nickname or colour.
            </Text>
          ) : null}

          {/* Explorers */}
          <SectionLabel
            right={
              sortedProfiles.length > 0 ? <FKChip label={`${sortedProfiles.length} of ${MAX_EXPLORERS}`} /> : undefined
            }
          >
            Explorers
          </SectionLabel>

          {showExplorerSkeleton ? (
            <View style={{ gap: 8 }}>
              <FKSkeleton height={72} />
              <FKSkeleton height={72} />
            </View>
          ) : (
            <View style={styles.group}>
              {sortedProfiles.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.rowTitle}>No explorers yet</Text>
                  <Text style={styles.rowSub}>Add the first one below. First names are perfect.</Text>
                </View>
              ) : null}

              {sortedProfiles.map((profile, i) => {
                const isOpen = editingProfileId === profile.id;
                const colour = isOpen ? editColor : profile.colour || DEFAULT_COLOUR;
                const points = xpByProfileId[profile.id] ?? profile.xp ?? 0;
                return (
                  <View key={profile.id}>
                    {i > 0 ? <View style={styles.divider} /> : null}
                    <Pressable
                      onPress={() => handleExpandEdit(profile)}
                      style={styles.explorerRow}
                      accessibilityRole="button"
                      accessibilityLabel={`${profile.name}, ${points} points. ${isOpen ? "Close" : "Edit"}`}
                      accessibilityState={{ expanded: isOpen }}
                      testID={`explorer-row-${i}`}
                    >
                      <View style={[styles.avatar, { backgroundColor: colour }]}>
                        <Text style={styles.avatarText}>{initialOf(isOpen ? editName || profile.name : profile.name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {profile.name}
                        </Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {profile.nickname || "Explorer"} · {points} {points === 1 ? "point" : "points"}
                        </Text>
                      </View>
                      <Ionicons name={isOpen ? "chevron-up" : "create-outline"} size={20} color={FK.muted} />
                    </Pressable>

                    {isOpen ? (
                      <Animated.View entering={FadeIn.duration(180)} style={styles.form}>
                        <ExplorerFields
                          name={editName}
                          onName={setEditName}
                          nickname={editNickname}
                          onShuffle={() => setEditNickname(generateNickname())}
                          colour={editColor}
                          onColour={setEditColor}
                        />
                        <FKButton
                          label="Save changes"
                          icon="checkmark"
                          onPress={() => void handleSaveEdit()}
                          loading={loading}
                          disabled={!editName.trim()}
                          style={{ marginTop: 6 }}
                        />
                        <View style={styles.formFooter}>
                          <FKButton label="Cancel" variant="link" onPress={() => setEditingProfileId(null)} />
                          <Pressable
                            onPress={() => setProfileToDelete(profile)}
                            hitSlop={10}
                            style={styles.removeLink}
                            accessibilityRole="button"
                          >
                            <Ionicons name="trash-outline" size={18} color={DANGER} />
                            <Text style={styles.removeText}>Remove {profile.name}</Text>
                          </Pressable>
                        </View>
                      </Animated.View>
                    ) : null}
                  </View>
                );
              })}

              {showAddForm ? (
                <Animated.View entering={FadeIn.duration(180)}>
                  {sortedProfiles.length > 0 ? <View style={styles.divider} /> : null}
                  <View style={[styles.form, { paddingTop: 16 }]}>
                    <Text style={[TYPE.label, { marginBottom: 12 }]}>New explorer</Text>
                    <ExplorerFields
                      name={name}
                      onName={setName}
                      nickname={addNickname}
                      onShuffle={() => setAddNickname(generateNickname())}
                      colour={selectedColor}
                      onColour={setSelectedColor}
                      nameHint="Only you see this."
                      autoFocus
                    />
                    <FKButton
                      label="Add explorer"
                      icon="add"
                      onPress={() => void handleAddExplorer()}
                      loading={loading}
                      disabled={!name.trim()}
                      style={{ marginTop: 6 }}
                      testID="explorers-add-save"
                    />
                    <FKButton label="Cancel" variant="link" onPress={() => setShowAddForm(false)} />
                  </View>
                </Animated.View>
              ) : null}
            </View>
          )}

          {!showExplorerSkeleton && !showAddForm ? (
            canAdd ? (
              <Pressable onPress={openAddForm} style={styles.addRow} accessibilityRole="button" testID="explorers-add">
                <Ionicons name="add" size={22} color={FK.ink} />
                <Text style={styles.addText}>Add an explorer</Text>
              </Pressable>
            ) : (
              <Text style={styles.note}>That's the most explorers one family can have.</Text>
            )
          ) : null}

          {/* Team */}
          <SectionLabel>Team</SectionLabel>
          {teamLoading ? (
            <FKSkeleton height={88} />
          ) : guide ? (
            <View style={[styles.teamCard, { borderLeftColor: guide.colour }]}>
              <View style={[styles.teamBadge, { backgroundColor: guide.colour }]}>
                <Image source={guide.badge} style={{ width: 48, height: 48 }} contentFit="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Team {guide.teamName}</Text>
                <Text style={styles.rowSub}>
                  {guide.guideName} leads the way. {sortedProfiles.length === 2 ? `They both score for the ${guide.teamName}.` : sortedProfiles.length > 2 ? `They all score for the ${guide.teamName}.` : "Anyone you add joins this team too."}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.teamCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>No team yet</Text>
                <Text style={styles.rowSub}>Your family's team will show here once it's chosen.</Text>
              </View>
            </View>
          )}

          {/* Recent adventures */}
          <SectionLabel>Recent adventures</SectionLabel>
          {recentActivitiesLoading && recentActivities.length === 0 ? (
            <FKSkeleton height={72} />
          ) : recentActivities.length === 0 ? (
            <View style={styles.group}>
              <View style={styles.emptyRow}>
                <Text style={styles.rowTitle}>Nothing yet</Text>
                <Text style={styles.rowSub}>Finished missions show up here.</Text>
              </View>
            </View>
          ) : (
            <RowGroup>
              {recentActivities.map((act) => (
                <LinkRow
                  key={act.id}
                  icon="flag-outline"
                  title={act.activity?.title ?? "Mission"}
                  sub={[act.profileName, formatDay(act.completed_at)].filter(Boolean).join(" · ")}
                  onPress={() => router.push("/(tabs)/missions")}
                />
              ))}
            </RowGroup>
          )}

          {/* More */}
          <SectionLabel>More for grown-ups</SectionLabel>
          <RowGroup>
            <LinkRow
              icon="settings-outline"
              title="Settings"
              sub="Emails, location, privacy"
              onPress={() => pushWithReturn("/(tabs)/settings")}
            />
            <LinkRow
              icon="book-outline"
              title="Grown-up guides"
              sub="Ideas and resources for you"
              onPress={() => pushWithReturn("/(tabs)/parents")}
            />
          </RowGroup>

          {/* Account actions, kept apart at the bottom */}
          <View style={styles.dangerZone}>
            <RowGroup>
              <LinkRow
                icon="log-out-outline"
                title="Sign out"
                sub={user?.email ? `Signed in as ${user.email}` : "Sign out on this phone"}
                onPress={handleSignOut}
                danger
                chevron={false}
                testID="profile-sign-out"
              />
            </RowGroup>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={profileToDelete !== null}
        animationType="fade"
        transparent
        onRequestClose={() => !deleting && setProfileToDelete(null)}
      >
        <View style={dialogStyles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !deleting && setProfileToDelete(null)}
            accessibilityLabel="Close"
          />
          <DialogCard>
            <Text style={dialogStyles.title}>Remove {profileToDelete?.name ?? "this explorer"}?</Text>
            <Text style={dialogStyles.body}>
              This removes {profileToDelete?.name ?? "this explorer"}'s progress, photos, badges and nickname from Huntly
              World. It can't be undone.
            </Text>
            <View style={dialogStyles.actions}>
              <DangerButton
                label={`Remove ${profileToDelete?.name ?? "explorer"}`}
                onPress={() => void handleConfirmDelete()}
                loading={deleting}
              />
              <FKButton
                label={`Keep ${profileToDelete?.name ?? "explorer"}`}
                variant="link"
                onPress={() => !deleting && setProfileToDelete(null)}
              />
            </View>
          </DialogCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** Name, nickname (shuffled, not typed) and colour, shared by add and edit. */
function ExplorerFields({
  name,
  onName,
  nickname,
  onShuffle,
  colour,
  onColour,
  nameHint,
  autoFocus,
}: {
  name: string;
  onName: (v: string) => void;
  nickname: string;
  onShuffle: () => void;
  colour: string;
  onColour: (hex: string) => void;
  nameHint?: string;
  autoFocus?: boolean;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>First name</Text>
      {nameHint ? <Text style={styles.fieldHint}>{nameHint}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="Explorer's first name"
        placeholderTextColor="#8C988F"
        value={name}
        onChangeText={onName}
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="done"
      />

      <Text style={styles.fieldLabel}>Nickname</Text>
      <View style={styles.nicknameRow}>
        <View style={styles.nicknameBox}>
          <Text style={styles.nicknameText} numberOfLines={1}>
            {nickname}
          </Text>
        </View>
        <Pressable onPress={onShuffle} style={styles.shuffle} accessibilityRole="button" accessibilityLabel="New nickname">
          <Ionicons name="shuffle" size={20} color={FK.sunbeam} />
          <Text style={styles.shuffleText}>New one</Text>
        </Pressable>
      </View>

      <Text style={styles.fieldLabel}>Colour</Text>
      <View style={styles.swatches}>
        {SWATCHES.map((s) => {
          const selected = s.hex.toLowerCase() === colour.toLowerCase();
          return (
            <Pressable
              key={s.hex}
              onPress={() => onColour(s.hex)}
              style={[styles.swatch, { backgroundColor: s.hex }, selected ? styles.swatchSelected : null]}
              accessibilityRole="button"
              accessibilityLabel={s.label}
              accessibilityState={{ selected }}
            >
              {selected ? <Ionicons name="checkmark" size={20} color={FK.white} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FK.moss },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  lead: { ...TYPE.bodySmall, fontSize: 16, lineHeight: 22, marginTop: -6 },
  group: { backgroundColor: FK.paper, borderRadius: RADIUS.lg, paddingHorizontal: 16, paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: FK.line, marginLeft: 58 },
  explorerRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, minHeight: 72 },
  emptyRow: { paddingVertical: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: FONT.display, fontSize: 19, color: FK.white },
  rowTitle: { fontFamily: FONT.display, fontSize: 16, color: FK.ink },
  rowSub: { fontFamily: FONT.body, fontSize: 14, lineHeight: 19, color: FK.muted, marginTop: 2 },
  form: { paddingBottom: 8 },
  formFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  removeLink: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 12 },
  removeText: { fontFamily: FONT.displayBold, fontSize: 16, color: DANGER },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#C5CFBC",
    paddingVertical: 16,
    marginTop: 10,
  },
  addText: { fontFamily: FONT.displayBold, fontSize: 16, color: FK.ink },
  note: { ...TYPE.bodySmall, marginTop: 10, paddingHorizontal: 4 },
  fieldLabel: { fontFamily: FONT.bodyBold, fontSize: 15, color: FK.ink, marginBottom: 6 },
  fieldHint: { fontFamily: FONT.body, fontSize: 13, color: FK.muted, marginTop: -4, marginBottom: 6 },
  input: {
    fontFamily: FONT.bodyBold,
    fontSize: 18,
    color: FK.ink,
    backgroundColor: FK.white,
    borderWidth: 1.5,
    borderColor: FK.line,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  nicknameRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  nicknameBox: {
    flex: 1,
    backgroundColor: FK.moss,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  nicknameText: { fontFamily: FONT.bodyBold, fontSize: 17, color: FK.ink },
  shuffle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: FK.ink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  shuffleText: { fontFamily: FONT.displayBold, fontSize: 15, color: FK.sunbeam },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  swatchSelected: { borderColor: FK.ink },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: FK.paper,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderLeftWidth: 6,
    borderLeftColor: FK.line,
  },
  teamBadge: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  dangerZone: { marginTop: 30, paddingTop: 22, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#CBD3C2" },
});
