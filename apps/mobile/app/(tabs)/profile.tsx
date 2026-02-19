import React, { useState, useEffect, useMemo } from "react";
import {
  TextInput,
  Alert,
  Pressable,
  ScrollView,
  View,
  Image,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/StatCard";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import {
  createProfile,
  getTeams,
  updateProfile,
  type Profile,
  type Team,
} from "@/services/profileService";
import { generateNickname } from "@/services/nicknameGenerator";
import { getTeamImageSource } from "@/utils/teamUtils";
import { ColorPicker } from "@/components/ui/ColorPicker";
import {
  getRecentCompletedActivities,
  type RecentCompletedActivity,
} from "@/services/activityProgressService";
import { useUserStats } from "@/hooks/useUserStats";
import { MaterialIcons } from "@expo/vector-icons";

// Design colors from reference
const COLORS = {
  darkGreen: "#4F6F52",
  cream: "#F8F7F4",
  accentBlue: "#A7D9ED",
  accentGreen: "#BEE6BE",
  activityCard: "#E8E8E8",
  arrow: "#C98D8D",
  white: "#FFFFFF",
  black: "#000000",
  charcoal: "#333333",
};

const PLAYER_ACCENTS = [COLORS.accentBlue, COLORS.accentGreen];

export default function ProfileScreen() {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("#FF6B35");
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editColor, setEditColor] = useState<string>("#FF6B35");
  const [editTeam, setEditTeam] = useState<number | null>(null);
  const [addNickname, setAddNickname] = useState(() => generateNickname());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddExplorer, setShowAddExplorer] = useState(false);
  const [recentActivities, setRecentActivities] = useState<
    RecentCompletedActivity[]
  >([]);
  const { user, signOut } = useAuth();
  const { currentPlayer, profiles, setCurrentPlayer, refreshProfiles } =
    usePlayer();
  const { daysPlayed, pointsEarned } = useUserStats();
  const router = useRouter();
  const { scaleW } = useLayoutScale();

  const sortedProfiles = useMemo(
    () =>
      [...profiles].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    [profiles],
  );

  const editScale = useSharedValue(1);
  const parentZoneScale = useSharedValue(1);
  const logOutScale = useSharedValue(1);
  const editAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: editScale.value }],
  }));
  const parentZoneAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: parentZoneScale.value }],
  }));
  const logOutAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logOutScale.value }],
  }));

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const refresh = async () => {
        if (isMounted) await refreshProfiles();
      };
      refresh();
      return () => {
        isMounted = false;
      };
    }, [refreshProfiles]),
  );

  useEffect(() => {
    let isMounted = true;
    const fetchTeams = async () => {
      try {
        const teamsData = await getTeams();
        if (isMounted) {
          setTeams(teamsData);
          if (teamsData.length > 0) setSelectedTeam(teamsData[0].id);
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
        if (isMounted) Alert.alert("Error", "Failed to load teams");
      }
    };
    fetchTeams();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentPlayer && user) {
      getRecentCompletedActivities(currentPlayer.id)
        .then(setRecentActivities)
        .catch(() => setRecentActivities([]));
    } else {
      setRecentActivities([]);
    }
  }, [currentPlayer?.id, user?.id]);

  useEffect(() => {
    const profile =
      editingProfileId != null
        ? profiles.find((p) => p.id === editingProfileId)
        : null;
    if (profile) {
      setEditName(profile.name);
      setEditNickname(profile.nickname || generateNickname());
      setEditColor(profile.colour);
      setEditTeam(profile.team);
    }
  }, [editingProfileId, profiles]);

  const handleCreateProfile = async () => {
    if (!name.trim() || !selectedTeam) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (!user) {
      Alert.alert("Error", "You must be logged in to create a profile");
      return;
    }
    setLoading(true);
    try {
      await createProfile({
        user_id: user.id,
        name: name.trim(),
        colour: selectedColor,
        team: selectedTeam,
      });
      await refreshProfiles();
      setName("");
      setShowAddExplorer(false);
      Alert.alert(
        "Explorer Created! 🎉",
        "Your new explorer has been created and is now active!",
        [{ text: "OK", onPress: () => router.replace("/") }],
      );
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to create explorer";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlayer = (profile: Profile) => {
    if (isEditing) return;
    setCurrentPlayer(profile);
    Alert.alert(
      "Explorer Selected! 🎉",
      `${profile.name} is now your active explorer!`,
      [{ text: "OK", onPress: () => router.replace("/") }],
    );
  };

  const handleExpandEdit = (profile: Profile) => {
    setShowAddForm(false);
    setEditingProfileId(profile.id);
    setEditName(profile.name);
    setEditNickname(profile.nickname || generateNickname());
    setEditColor(profile.colour);
    setEditTeam(profile.team);
  };

  const handleSaveEdit = async () => {
    if (editingProfileId == null || !editName.trim() || !editNickname.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    const profile = profiles.find((p) => p.id === editingProfileId);
    if (!profile) return;
    setLoading(true);
    try {
      const updatedProfile = await updateProfile(editingProfileId, {
        name: editName.trim(),
        nickname: editNickname.trim(),
        colour: editColor,
        team: profile.team,
      });
      if (currentPlayer?.id === editingProfileId)
        setCurrentPlayer(updatedProfile);
      await refreshProfiles();
      setEditingProfileId(null);
      Alert.alert("Success", "Explorer updated successfully!");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to update explorer";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProfileId(null);
  };

  const handleDoneEditing = () => {
    setIsEditing(false);
    setEditingProfileId(null);
    setShowAddForm(false);
  };

  const handleAddExplorerInline = async () => {
    if (!name.trim() || !user) {
      Alert.alert("Error", "Please fill in name");
      return;
    }
    const defaultTeam = currentPlayer?.team ?? teams[0]?.id;
    if (defaultTeam == null) {
      Alert.alert("Error", "No team available. Please try again later.");
      return;
    }
    setLoading(true);
    try {
      await createProfile({
        user_id: user.id,
        name: name.trim(),
        nickname: addNickname.trim() || generateNickname(),
        colour: selectedColor,
        team: defaultTeam,
      });
      await refreshProfiles();
      setName("");
      setAddNickname(generateNickname());
      setShowAddForm(false);
      Alert.alert("Explorer created", "Your new explorer has been added.");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to create explorer";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const formatActivityDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const day = d.getDate();
    const suffix =
      day === 1 || day === 21 || day === 31
        ? "st"
        : day === 2 || day === 22
          ? "nd"
          : day === 3 || day === 23
            ? "rd"
            : "th";
    const months = [
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
    return `Completed ${day}${suffix} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: COLORS.darkGreen,
        },
        headerBar: {
          backgroundColor: COLORS.darkGreen,
        },
        scrollView: {
          flex: 1,
        },
        scrollContent: {
          paddingHorizontal: scaleW(20),
          paddingTop: scaleW(8),
          paddingBottom: scaleW(32),
        },
        section: {
          marginBottom: scaleW(24),
        },
        sectionHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: scaleW(12),
        },
        sectionTitle: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: COLORS.white,
          marginBottom: scaleW(12),
        },
        editIconWrap: {
          padding: scaleW(4),
        },
        cardCream: {
          backgroundColor: COLORS.cream,
          borderRadius: scaleW(20),
          padding: scaleW(16),
        },
        cardTextPrimary: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: COLORS.black,
        },
        cardTextSecondary: {
          fontSize: scaleW(14),
          color: COLORS.charcoal,
          marginTop: scaleW(4),
        },
        playerCard: {
          flexDirection: "row",
          backgroundColor: COLORS.cream,
          borderRadius: scaleW(20),
          marginBottom: scaleW(12),
          overflow: "hidden",
          minHeight: scaleW(64),
          borderWidth: 3,
          borderColor: "#FFF",
        },
        playerCardSelected: {
          borderColor: "#333",
        },
        playerAccent: {
          width: scaleW(20),
          borderRadius: scaleW(2),
        },
        playerCardContent: {
          flex: 1,
          paddingVertical: scaleW(12),
          paddingHorizontal: scaleW(16),
          justifyContent: "center",
        },
        playerName: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: COLORS.black,
        },
        playerNickname: {
          fontSize: scaleW(14),
          color: COLORS.charcoal,
          marginTop: scaleW(2),
        },
        addNewPlayerCard: {
          marginTop: scaleW(4),
        },
        addExplorerRow: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: scaleW(8),
        },
        addExplorerIcon: {
          width: scaleW(40),
          height: scaleW(40),
          borderRadius: scaleW(20),
          backgroundColor: "rgba(255,255,255,0.25)",
          alignItems: "center",
          justifyContent: "center",
          marginRight: scaleW(12),
        },
        progressRow: {
          flexDirection: "row",
          justifyContent: "center",
          gap: scaleW(16),
          paddingHorizontal: scaleW(12),
        },
        activityCard: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: COLORS.activityCard,
          borderRadius: scaleW(18),
          padding: scaleW(20),
          marginBottom: scaleW(8),
        },
        activityCardContent: {
          flex: 1,
        },
        activityName: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: COLORS.black,
        },
        activityDate: {
          fontSize: scaleW(16),
          color: COLORS.charcoal,
          marginTop: scaleW(2),
        },
        activityArrow: {
          marginLeft: scaleW(8),
        },
        parentZoneButton: {
          backgroundColor: COLORS.cream,
          borderRadius: scaleW(40),
          paddingVertical: scaleW(16),
          alignItems: "center",
          marginTop: scaleW(8),
          marginBottom: scaleW(24),
          marginHorizontal: scaleW(40),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
        },
        parentZoneText: {
          fontSize: scaleW(17),
          fontWeight: "600",
        },
        logOutButtonWrap: {
          marginTop: scaleW(8),
          marginBottom: scaleW(32),
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          padding: scaleW(24),
        },
        modalContent: {
          backgroundColor: COLORS.white,
          borderRadius: scaleW(24),
          padding: scaleW(24),
          maxHeight: "85%",
        },
        modalTitle: {
          fontSize: scaleW(20),
          fontWeight: "700",
          color: COLORS.charcoal,
          marginBottom: scaleW(16),
        },
        input: {
          height: scaleW(52),
          borderWidth: 2,
          borderColor: "#BEE6BE",
          borderRadius: scaleW(14),
          paddingHorizontal: scaleW(16),
          backgroundColor: COLORS.cream,
          fontSize: scaleW(16),
          color: COLORS.charcoal,
          marginBottom: scaleW(16),
        },
        inputLabel: {
          fontSize: scaleW(15),
          fontWeight: "600",
          color: COLORS.charcoal,
          marginBottom: scaleW(8),
        },
        nicknameRow: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: scaleW(16),
        },
        nicknameDisplay: {
          flex: 1,
          height: scaleW(52),
          borderWidth: 2,
          borderColor: "#BEE6BE",
          borderRadius: scaleW(14),
          paddingHorizontal: scaleW(16),
          backgroundColor: COLORS.cream,
          justifyContent: "center",
        },
        nicknameText: {
          fontSize: scaleW(16),
          color: COLORS.charcoal,
        },
        generateBtn: {
          marginLeft: scaleW(12),
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(16),
          backgroundColor: "#4F6F52",
          borderRadius: scaleW(14),
        },
        generateBtnText: {
          fontSize: scaleW(15),
          fontWeight: "600",
          color: COLORS.white,
        },
        colorPickerWrap: {
          marginBottom: scaleW(16),
        },
        teamsScroll: {
          marginBottom: scaleW(20),
        },
        teamOption: {
          width: scaleW(80),
          height: scaleW(80),
          marginRight: scaleW(12),
          borderRadius: scaleW(14),
          overflow: "hidden",
          borderWidth: 3,
          borderColor: "transparent",
        },
        teamOptionSelected: {
          borderColor: "#4F6F52",
        },
        teamImage: {
          width: "100%",
          height: "100%",
        },
        teamColorDot: {
          width: "100%",
          height: "100%",
          borderRadius: scaleW(14),
        },
        modalActions: {
          flexDirection: "row",
          gap: scaleW(12),
        },
        modalButton: {
          flex: 1,
          height: scaleW(52),
          borderRadius: scaleW(14),
          alignItems: "center",
          justifyContent: "center",
        },
        modalButtonCancel: {
          backgroundColor: COLORS.charcoal,
        },
        modalButtonCancelText: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: COLORS.white,
        },
        modalButtonSave: {
          backgroundColor: "#4F6F52",
        },
        modalButtonSaveText: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: COLORS.white,
        },
        noTeams: {
          padding: scaleW(16),
          backgroundColor: "#E8F5E9",
          borderRadius: scaleW(14),
          alignItems: "center",
          marginBottom: scaleW(20),
        },
        noTeamsText: {
          fontSize: scaleW(15),
          color: COLORS.charcoal,
        },
        modalClose: {
          marginTop: scaleW(12),
          alignItems: "center",
        },
        modalCloseText: {
          fontSize: scaleW(15),
          color: COLORS.charcoal,
          fontWeight: "600",
        },
        inlineFormPadding: {
          padding: scaleW(24),
        },
        inlineFormLabel: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: COLORS.charcoal,
          marginBottom: scaleW(4),
        },
        inlineFormHint: {
          fontSize: scaleW(12),
          color: COLORS.charcoal,
          marginBottom: scaleW(8),
        },
        inlineFormInput: {
          height: scaleW(48),
          borderWidth: 2,
          borderColor: COLORS.accentGreen,
          borderRadius: scaleW(12),
          paddingHorizontal: scaleW(16),
          fontSize: scaleW(16),
          color: COLORS.charcoal,
          backgroundColor: COLORS.white,
          marginBottom: scaleW(16),
        },
        inlineAddCard: {
          backgroundColor: COLORS.cream,
          borderRadius: scaleW(20),
          padding: scaleW(24),
          marginTop: scaleW(8),
        },
      }),
    [scaleW],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* Your players */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(0).springify().damping(18)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <ThemedText type="heading" style={styles.sectionTitle}>
              Your players
            </ThemedText>
            {isEditing ? (
              <Pressable
                onPress={handleDoneEditing}
                style={styles.editIconWrap}
                hitSlop={12}
              >
                <ThemedText
                  style={{
                    fontSize: scaleW(16),
                    fontWeight: "600",
                    color: COLORS.white,
                  }}
                >
                  Done
                </ThemedText>
              </Pressable>
            ) : (
              <Animated.View style={editAnimatedStyle}>
                <Pressable
                  onPress={() => setIsEditing(true)}
                  onPressIn={() => {
                    editScale.value = withSpring(0.96, {
                      damping: 15,
                      stiffness: 400,
                    });
                  }}
                  onPressOut={() => {
                    editScale.value = withSpring(1, {
                      damping: 15,
                      stiffness: 400,
                    });
                  }}
                  style={styles.editIconWrap}
                  hitSlop={12}
                >
                  <MaterialIcons name="edit" size={22} color={COLORS.white} />
                </Pressable>
              </Animated.View>
            )}
          </View>

          {!isEditing && profiles.length === 0 && (
            <View style={styles.cardCream}>
              <ThemedText style={styles.cardTextPrimary}>
                No players yet
              </ThemedText>
              <ThemedText style={styles.cardTextSecondary}>
                Tap Edit to add an explorer
              </ThemedText>
            </View>
          )}

          {!isEditing &&
            sortedProfiles.length > 0 &&
            sortedProfiles.map((profile, index) => (
              <Animated.View
                key={profile.id}
                entering={FadeInDown.duration(400)
                  .delay(80 + index * 60)
                  .springify()
                  .damping(18)}
              >
                <Pressable
                  style={[
                    styles.playerCard,
                    currentPlayer?.id === profile.id &&
                      styles.playerCardSelected,
                  ]}
                  onPress={() => handleSelectPlayer(profile)}
                >
                  <View
                    style={[
                      styles.playerAccent,
                      {
                        backgroundColor:
                          profile.colour ||
                          PLAYER_ACCENTS[index % PLAYER_ACCENTS.length],
                      },
                    ]}
                  />
                  <View style={styles.playerCardContent}>
                    <ThemedText type="heading" style={styles.playerName}>
                      {profile.name}
                    </ThemedText>
                    <ThemedText style={styles.playerNickname}>
                      {profile.nickname || "Explorer"}
                    </ThemedText>
                  </View>
                </Pressable>
              </Animated.View>
            ))}

          {isEditing && (
            <>
              {sortedProfiles.map((profile, index) => {
                const isExpanded = editingProfileId === profile.id;
                return (
                  <View
                    key={profile.id}
                    style={[
                      styles.playerCard,
                      { marginBottom: scaleW(12), minHeight: undefined },
                    ]}
                  >
                    <View
                      style={[
                        styles.playerAccent,
                        {
                          backgroundColor: isExpanded
                            ? editColor
                            : profile.colour ||
                              PLAYER_ACCENTS[index % PLAYER_ACCENTS.length],
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      {isExpanded ? (
                        <View style={styles.inlineFormPadding}>
                          <ThemedText style={styles.inlineFormLabel}>
                            Name
                          </ThemedText>
                          <TextInput
                            style={styles.inlineFormInput}
                            placeholder="Enter name"
                            placeholderTextColor="#9CA3AF"
                            value={editName}
                            onChangeText={setEditName}
                            autoCapitalize="words"
                          />
                          <ThemedText style={styles.inlineFormLabel}>
                            Explorer Nickname
                          </ThemedText>
                          <View style={styles.nicknameRow}>
                            <View style={styles.nicknameDisplay}>
                              <ThemedText style={styles.nicknameText}>
                                {editNickname}
                              </ThemedText>
                            </View>
                            <Pressable
                              style={styles.generateBtn}
                              onPress={() =>
                                setEditNickname(generateNickname())
                              }
                            >
                              <ThemedText style={styles.generateBtnText}>
                                🎲 Generate
                              </ThemedText>
                            </Pressable>
                          </View>
                          <ThemedText style={styles.inlineFormLabel}>
                            Colour
                          </ThemedText>
                          <View style={styles.colorPickerWrap}>
                            <ColorPicker
                              selectedColor={editColor}
                              onColorSelect={setEditColor}
                              size="medium"
                            />
                          </View>
                          <View style={styles.modalActions}>
                            <Pressable
                              style={[
                                styles.modalButton,
                                styles.modalButtonCancel,
                              ]}
                              onPress={handleCancelEdit}
                            >
                              <ThemedText style={styles.modalButtonCancelText}>
                                Cancel
                              </ThemedText>
                            </Pressable>
                            <Pressable
                              style={[
                                styles.modalButton,
                                styles.modalButtonSave,
                              ]}
                              onPress={handleSaveEdit}
                              disabled={loading}
                            >
                              {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                              ) : (
                                <ThemedText style={styles.modalButtonSaveText}>
                                  Save
                                </ThemedText>
                              )}
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleExpandEdit(profile)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: scaleW(16),
                            paddingHorizontal: scaleW(20),
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <ThemedText
                              type="heading"
                              style={styles.playerName}
                            >
                              {profile.name}
                            </ThemedText>
                            <ThemedText style={styles.playerNickname}>
                              {profile.nickname || "Explorer"}
                            </ThemedText>
                          </View>
                          <MaterialIcons
                            name="edit"
                            size={scaleW(22)}
                            color={COLORS.darkGreen}
                          />
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}

              {(editingProfileId !== null ||
                (editingProfileId === null && !showAddForm)) && (
                <Pressable
                  onPress={() => {
                    setEditingProfileId(null);
                    setShowAddForm(true);
                  }}
                  style={[styles.playerCard, styles.addNewPlayerCard]}
                >
                  <View
                    style={[
                      styles.playerAccent,
                      { backgroundColor: COLORS.accentGreen },
                    ]}
                  />
                  <View style={styles.playerCardContent}>
                    <ThemedText type="heading" style={styles.playerName}>
                      Add a new player
                    </ThemedText>
                  </View>
                  <View
                    style={{
                      justifyContent: "center",
                      marginRight: scaleW(16),
                    }}
                  >
                    <MaterialIcons
                      name="add"
                      size={scaleW(24)}
                      color={COLORS.darkGreen}
                    />
                  </View>
                </Pressable>
              )}

              {editingProfileId === null && showAddForm && (
                <View style={styles.inlineAddCard}>
                  <ThemedText style={styles.inlineFormLabel}>Name</ThemedText>
                  <ThemedText style={styles.inlineFormHint}>
                    (Only visible to you)
                  </ThemedText>
                  <TextInput
                    style={styles.inlineFormInput}
                    placeholder="Enter name"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                  <ThemedText style={styles.inlineFormLabel}>
                    Explorer Nickname
                  </ThemedText>
                  <View style={styles.nicknameRow}>
                    <View style={styles.nicknameDisplay}>
                      <ThemedText style={styles.nicknameText}>
                        {addNickname}
                      </ThemedText>
                    </View>
                    <Pressable
                      style={styles.generateBtn}
                      onPress={() => setAddNickname(generateNickname())}
                    >
                      <ThemedText style={styles.generateBtnText}>
                        🎲 Generate
                      </ThemedText>
                    </Pressable>
                  </View>
                  <ThemedText style={styles.inlineFormLabel}>Colour</ThemedText>
                  <View style={styles.colorPickerWrap}>
                    <ColorPicker
                      selectedColor={selectedColor}
                      onColorSelect={setSelectedColor}
                      size="medium"
                    />
                  </View>
                  <Pressable
                    style={[
                      styles.modalButton,
                      styles.modalButtonSave,
                      { marginTop: scaleW(12) },
                    ]}
                    onPress={handleAddExplorerInline}
                    disabled={loading || !name.trim()}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <ThemedText style={styles.modalButtonSaveText}>
                        Add Explorer
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              )}
            </>
          )}
        </Animated.View>

        {/* Your progress */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(150).springify().damping(18)}
          style={styles.section}
        >
          <ThemedText type="heading" style={styles.sectionTitle}>
            Your progress
          </ThemedText>
          <View style={styles.progressRow}>
            <StatCard value={daysPlayed} label="Days since started" color="pink" />
            <StatCard
              value={pointsEarned}
              label="Points earned"
              color="green"
            />
          </View>
        </Animated.View>

        {/* Top Skills — commented out
        <Animated.View
          entering={FadeInDown.duration(500).delay(280).springify().damping(18)}
          style={styles.section}
        >
          <View style={styles.skillsCard}>
            <View style={styles.skillsRow}>
              <View style={styles.skillItem}>
                <Image
                  source={PLANTING_IMAGE}
                  style={styles.skillIcon}
                  resizeMode="contain"
                />
                <ThemedText type="heading" style={styles.skillLabel}>Planting</ThemedText>
              </View>
              <View style={styles.skillItem}>
                <Image
                  source={MATHS_IMAGE}
                  style={styles.skillIcon}
                  resizeMode="contain"
                />
                <ThemedText type="heading" style={styles.skillLabel}>Maths</ThemedText>
              </View>
              <View style={styles.skillItem}>
                <Image
                  source={RESILIENCE_IMAGE}
                  style={styles.skillIcon}
                  resizeMode="contain"
                />
                <ThemedText type="heading" style={styles.skillLabel}>Resilience</ThemedText>
              </View>
            </View>
            <ThemedText type="heading" style={styles.skillsTitle}>Top Skills</ThemedText>
          </View>
        </Animated.View>
        */}

        {/* Your badges — commented out
        <Animated.View
          entering={FadeInDown.duration(500).delay(380).springify().damping(18)}
          style={styles.section}
        >
          <ThemedText type="heading" style={styles.sectionTitle}>Your badges</ThemedText>
          <View style={styles.badgesWrap}>
            {(userBadges.length > 0
              ? userBadges.slice(0, 5)
              : [1, 2, 3, 4, 5]
            ).map((item, i) => (
              <View
                key={typeof item === "number" ? `badge-placeholder-${item}` : item.id}
                style={styles.badgeIcon}
              >
                <Image
                  source={BADGE_IMAGE}
                  style={styles.badgeImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </View>
        </Animated.View>
        */}

        {/* Recent activities */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(480).springify().damping(18)}
          style={styles.section}
        >
          <ThemedText type="heading" style={styles.sectionTitle}>
            Recent activities
          </ThemedText>
          {recentActivities.length === 0 ? (
            <View style={styles.activityCard}>
              <View style={styles.activityCardContent}>
                <ThemedText type="heading" style={styles.activityName}>
                  No activities yet
                </ThemedText>
                <ThemedText style={styles.activityDate}>
                  Complete missions to see them here
                </ThemedText>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={COLORS.arrow}
                style={styles.activityArrow}
              />
            </View>
          ) : (
            recentActivities.map((act) => (
              <Pressable
                key={act.id}
                style={styles.activityCard}
                onPress={() => router.push("/(tabs)/missions")}
              >
                <View style={styles.activityCardContent}>
                  <ThemedText
                    type="heading"
                    style={styles.activityName}
                    numberOfLines={1}
                  >
                    {act.activity?.title ?? "Activity"}
                  </ThemedText>
                  <ThemedText style={styles.activityDate}>
                    {formatActivityDate(act.completed_at)}
                  </ThemedText>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={COLORS.arrow}
                  style={styles.activityArrow}
                />
              </Pressable>
            ))
          )}
        </Animated.View>

        {/* Parent Zone */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(580).springify().damping(18)}
          style={parentZoneAnimatedStyle}
        >
          <Pressable
            style={styles.parentZoneButton}
            onPress={() => router.push("/(tabs)/parents")}
            onPressIn={() => {
              parentZoneScale.value = withSpring(0.96, {
                damping: 15,
                stiffness: 400,
              });
            }}
            onPressOut={() => {
              parentZoneScale.value = withSpring(1, {
                damping: 15,
                stiffness: 400,
              });
            }}
          >
            <ThemedText type="heading" style={styles.parentZoneText}>
              Parent Zone
            </ThemedText>
          </Pressable>
        </Animated.View>

        {/* Log out */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(620).springify().damping(18)}
          style={[logOutAnimatedStyle, styles.logOutButtonWrap]}
        >
          <Pressable
            style={styles.parentZoneButton}
            onPress={() => {
              Alert.alert("Log out", "Are you sure you want to log out?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Log out",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await signOut();
                    } catch {
                      Alert.alert("Error", "Failed to log out");
                    }
                  },
                },
              ]);
            }}
            onPressIn={() => {
              logOutScale.value = withSpring(0.96, {
                damping: 15,
                stiffness: 400,
              });
            }}
            onPressOut={() => {
              logOutScale.value = withSpring(1, {
                damping: 15,
                stiffness: 400,
              });
            }}
          >
            <ThemedText type="heading" style={styles.parentZoneText}>
              Log out
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* Add explorer modal */}
      <Modal
        visible={showAddExplorer}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddExplorer(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Add New Explorer</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Explorer Name"
              placeholderTextColor="#8B4513"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <ThemedText style={styles.inputLabel}>Choose Your Color</ThemedText>
            <View style={styles.colorPickerWrap}>
              <ColorPicker
                selectedColor={selectedColor}
                onColorSelect={setSelectedColor}
                size="medium"
              />
            </View>
            <ThemedText style={styles.inputLabel}>Choose Your Team</ThemedText>
            {teams.length === 0 ? (
              <View style={styles.noTeams}>
                <ThemedText style={styles.noTeamsText}>
                  No teams available yet
                </ThemedText>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.teamsScroll}
              >
                {teams.map((team) => {
                  const teamImage = getTeamImageSource(team.name);
                  const isSelected = selectedTeam === team.id;
                  return (
                    <Pressable
                      key={team.id}
                      onPress={() => setSelectedTeam(team.id)}
                      style={[
                        styles.teamOption,
                        isSelected && styles.teamOptionSelected,
                      ]}
                    >
                      {teamImage ? (
                        <Image
                          source={teamImage}
                          style={styles.teamImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View
                          style={[
                            styles.teamColorDot,
                            { backgroundColor: team.colour || "#ccc" },
                          ]}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <Pressable
              style={[styles.modalButton, styles.modalButtonSave]}
              onPress={handleCreateProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <ThemedText style={styles.modalButtonSaveText}>
                  Add Explorer
                </ThemedText>
              )}
            </Pressable>
            <Pressable
              style={styles.modalClose}
              onPress={() => setShowAddExplorer(false)}
            >
              <ThemedText style={styles.modalCloseText}>Cancel</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
