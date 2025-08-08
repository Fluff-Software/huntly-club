import React, { useState, useEffect } from "react";
import {
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { ThemedText } from "@/components/ThemedText";
import { BaseLayout } from "@/components/layout/BaseLayout";
import {
  createProfile,
  getTeams,
  updateProfile,
  type Profile,
} from "@/services/profileService";
import { generateNickname } from "@/services/nicknameGenerator";
import { XPBar } from "@/components/XPBar";

const COLOR_OPTIONS = [
  "#FF6B35", // team-fox
  "#8B4513", // team-bear
  "#4682B4", // team-otter
  "#4A7C59", // huntly-leaf
  "#7FB069", // huntly-sage
  "#FFA500", // huntly-amber
  "#FFD93D", // huntly-sunshine
  "#87CEEB", // huntly-sky
  "#A8D5BA", // huntly-mint
  "#FFB347", // huntly-peach
];

export default function ProfileScreen() {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teams, setTeams] = useState<
    { id: number; name: string; colour: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editColor, setEditColor] = useState(COLOR_OPTIONS[0]);
  const [editTeam, setEditTeam] = useState<number | null>(null);
  const { user, signOut } = useAuth();
  const { currentPlayer, profiles, setCurrentPlayer, refreshProfiles } =
    usePlayer();
  const router = useRouter();

  // Refresh profiles when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;

      const refresh = async () => {
        if (isMounted) {
          await refreshProfiles();
        }
      };

      refresh();

      return () => {
        isMounted = false;
      };
    }, [refreshProfiles])
  );

  useEffect(() => {
    let isMounted = true;

    const fetchTeams = async () => {
      try {
        const teamsData = await getTeams();
        if (isMounted) {
          setTeams(teamsData);
          if (teamsData.length > 0) {
            setSelectedTeam(teamsData[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
        if (isMounted) {
          Alert.alert("Error", "Failed to load teams");
        }
      }
    };
    fetchTeams();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize edit form when entering edit mode
  useEffect(() => {
    if (currentPlayer && isEditing) {
      setEditName(currentPlayer.name);
      setEditNickname(currentPlayer.nickname || generateNickname());
      setEditColor(currentPlayer.colour);
      setEditTeam(currentPlayer.team);
    }
  }, [isEditing, currentPlayer?.id]); // Only depend on isEditing and currentPlayer.id, not the entire currentPlayer object

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
      Alert.alert(
        "Explorer Created! 🎉",
        "Your new explorer has been created and is now active! You can now access all the adventure features.",
        [
          {
            text: "Start Adventure",
            onPress: () => {
              router.replace("/");
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create explorer");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlayer = (profile: Profile) => {
    setCurrentPlayer(profile);
    setIsEditing(false); // Exit edit mode when selecting a different player
    Alert.alert(
      "Explorer Selected! 🎉",
      `${profile.name} is now your active explorer! All adventure features are now unlocked.`,
      [
        {
          text: "Start Adventure",
          onPress: () => {
            // Navigate to home tab after selection
            router.replace("/");
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (
      !currentPlayer ||
      !editName.trim() ||
      !editNickname.trim() ||
      !editTeam
    ) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const updatedProfile = await updateProfile(currentPlayer.id, {
        name: editName.trim(),
        nickname: editNickname.trim(),
        colour: editColor,
        team: editTeam,
      });

      // Update the current player with the new data
      setCurrentPlayer(updatedProfile);
      await refreshProfiles();
      setIsEditing(false);
      Alert.alert("Success", "Explorer updated successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update explorer");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName("");
    setEditNickname("");
    setEditColor(COLOR_OPTIONS[0]);
    setEditTeam(null);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            // The AuthGuard will handle redirecting to login
          } catch (error) {
            Alert.alert("Error", "Failed to logout");
          }
        },
      },
    ]);
  };

  return (
    <BaseLayout className="bg-huntly-cream">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-6">
          <ThemedText
            type="title"
            className="text-huntly-forest text-center mb-2"
          >
            Who's Playing?
          </ThemedText>
          <ThemedText type="body" className="text-huntly-charcoal text-center">
            Choose your character and join the adventure!
          </ThemedText>
        </View>

        {/* Current Active Player */}
        {currentPlayer ? (
          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-4">
              <ThemedText type="subtitle" className="text-huntly-forest">
                Active Explorer
              </ThemedText>
              {!isEditing && (
                <Pressable
                  className="bg-huntly-leaf px-4 py-2 rounded-xl"
                  onPress={() => setIsEditing(true)}
                >
                  <ThemedText className="text-white font-semibold">
                    Edit
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {isEditing ? (
              // Edit Mode
              <View className="bg-white rounded-2xl p-6 shadow-soft border-2 border-huntly-amber">
                <ThemedText type="subtitle" className="text-huntly-forest mb-4">
                  Edit Explorer
                </ThemedText>

                {/* Edit Name */}
                <TextInput
                  className="h-14 mb-4 border-2 border-huntly-mint rounded-xl px-4 bg-huntly-cream text-huntly-forest text-base"
                  placeholder="Explorer Name"
                  placeholderTextColor="#8B4513"
                  value={editName}
                  onChangeText={setEditName}
                  autoCapitalize="words"
                />

                {/* Edit Nickname */}
                <ThemedText
                  type="defaultSemiBold"
                  className="text-huntly-forest mb-4"
                >
                  Adventure Nickname
                </ThemedText>
                <View className="mb-4">
                  <View className="flex-row items-center mb-3">
                    <View className="flex-1 h-14 border-2 border-huntly-mint rounded-xl px-4 bg-huntly-cream justify-center">
                      <ThemedText className="text-huntly-forest text-base">
                        {editNickname}
                      </ThemedText>
                    </View>
                    <Pressable
                      className="bg-huntly-leaf h-14 px-4 rounded-xl justify-center items-center shadow-soft ml-3"
                      onPress={() => setEditNickname(generateNickname())}
                    >
                      <ThemedText className="text-white font-semibold">
                        🎲 Generate
                      </ThemedText>
                    </Pressable>
                  </View>
                  <ThemedText className="text-huntly-brown text-sm">
                    Tap Generate to create a random adventure nickname!
                  </ThemedText>
                </View>

                {/* Edit Color */}
                <ThemedText
                  type="defaultSemiBold"
                  className="text-huntly-forest mb-4"
                >
                  Choose Your Color
                </ThemedText>
                <View className="flex-row flex-wrap mb-6">
                  {COLOR_OPTIONS.map((color) => (
                    <Pressable
                      key={color}
                      className={`w-12 h-12 rounded-full mr-3 mb-3 ${
                        editColor === color
                          ? "border-4 border-huntly-forest"
                          : "border-2 border-huntly-mint"
                      }`}
                      style={{ backgroundColor: color }}
                      onPress={() => setEditColor(color)}
                    />
                  ))}
                </View>

                {/* Edit Team */}
                <ThemedText
                  type="defaultSemiBold"
                  className="text-huntly-forest mb-4"
                >
                  Choose Your Team
                </ThemedText>
                <View className="mb-6">
                  <View>
                    {teams.map((team) => (
                      <Pressable
                        key={team.id}
                        className={`flex-row items-center p-4 rounded-xl border-2 mb-3 ${
                          editTeam === team.id
                            ? "bg-huntly-leaf border-huntly-leaf"
                            : "bg-white border-huntly-mint"
                        }`}
                        onPress={() => setEditTeam(team.id)}
                      >
                        <View
                          className="w-8 h-8 rounded-full mr-3"
                          style={{ backgroundColor: team.colour }}
                        />
                        <ThemedText
                          type="defaultSemiBold"
                          className={`flex-1 ${
                            editTeam === team.id
                              ? "text-white"
                              : "text-huntly-forest"
                          }`}
                        >
                          {team.name}
                        </ThemedText>
                        {editTeam === team.id && (
                          <ThemedText className="text-white text-lg">
                            ✓
                          </ThemedText>
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Edit Action Buttons */}
                <View className="flex-row space-x-3">
                  <Pressable
                    className="flex-1 bg-huntly-charcoal h-14 rounded-xl justify-center items-center"
                    onPress={handleCancelEdit}
                  >
                    <ThemedText className="text-white font-bold text-lg">
                      Cancel
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    className="flex-1 bg-huntly-amber h-14 rounded-xl justify-center items-center shadow-soft"
                    onPress={handleSaveEdit}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#2D5A27" />
                    ) : (
                      <ThemedText className="text-huntly-forest font-bold text-lg">
                        Save
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              // Display Mode
              <View className="bg-white rounded-2xl p-4 shadow-soft border-2 border-huntly-leaf">
                <View className="flex-row items-center mb-4">
                  <View
                    style={{ backgroundColor: currentPlayer.colour }}
                    className="w-12 h-12 rounded-full mr-4 items-center justify-center"
                  >
                    <ThemedText className="text-white text-lg font-bold">
                      {currentPlayer.name.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View className="flex-1">
                    <ThemedText
                      type="defaultSemiBold"
                      className="text-huntly-forest"
                    >
                      {currentPlayer.name}
                    </ThemedText>
                    {currentPlayer.nickname && (
                      <ThemedText
                        type="caption"
                        className="text-huntly-leaf font-medium"
                      >
                        {currentPlayer.nickname}
                      </ThemedText>
                    )}
                  </View>
                  <View className="bg-huntly-leaf px-3 py-1 rounded-full">
                    <ThemedText
                      type="caption"
                      className="text-white font-semibold"
                    >
                      ACTIVE
                    </ThemedText>
                  </View>
                </View>

                {/* XP Bar */}
                <XPBar
                  currentXP={currentPlayer.xp || 0}
                  level={Math.floor((currentPlayer.xp || 0) / 100) + 1}
                />
              </View>
            )}
          </View>
        ) : null}

        {/* Available Players */}
        {profiles.length > 0 ? (
          <View className="mb-8">
            <ThemedText type="subtitle" className="text-huntly-forest mb-4">
              Available Explorers
            </ThemedText>
            <View>
              {profiles.map((profile) => (
                <Pressable
                  key={profile.id}
                  className={`flex-row items-center bg-white p-4 rounded-2xl shadow-soft border-2 mb-3 ${
                    currentPlayer?.id === profile.id
                      ? "border-huntly-leaf"
                      : "border-huntly-mint"
                  }`}
                  onPress={() => handleSelectPlayer(profile)}
                >
                  <View
                    style={{ backgroundColor: profile.colour }}
                    className="w-12 h-12 rounded-full mr-4 items-center justify-center"
                  >
                    <ThemedText className="text-white text-lg font-bold">
                      {profile.name.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View className="flex-1">
                    <ThemedText
                      type="defaultSemiBold"
                      className="text-huntly-forest"
                    >
                      {profile.name}
                    </ThemedText>
                    {profile.nickname && (
                      <ThemedText
                        type="caption"
                        className="text-huntly-leaf font-medium"
                      >
                        {profile.nickname}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText className="text-huntly-charcoal">
                    Tap to select
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Add New Player Section */}
        <View className="bg-white rounded-2xl p-6 shadow-soft mb-8">
          <ThemedText type="subtitle" className="text-huntly-forest mb-4">
            Add New Explorer
          </ThemedText>

          <TextInput
            className="h-14 mb-6 border-2 border-huntly-mint rounded-xl px-4 bg-huntly-cream text-huntly-forest text-base"
            placeholder="Explorer Name"
            placeholderTextColor="#8B4513"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          {/* Color Selection */}
          <ThemedText
            type="defaultSemiBold"
            className="text-huntly-forest mb-4"
          >
            Choose Your Color
          </ThemedText>
          <View className="flex-row flex-wrap mb-6">
            {COLOR_OPTIONS.map((color) => (
              <Pressable
                key={color}
                className={`w-12 h-12 rounded-full mr-3 mb-3 ${
                  selectedColor === color
                    ? "border-4 border-huntly-forest"
                    : "border-2 border-huntly-mint"
                }`}
                style={{ backgroundColor: color }}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>

          {/* Team Selection */}
          <ThemedText
            type="defaultSemiBold"
            className="text-huntly-forest mb-4"
          >
            Choose Your Team
          </ThemedText>
          <View className="mb-6">
            {teams.length === 0 ? (
              <View className="bg-huntly-mint rounded-xl p-4 items-center">
                <ThemedText
                  type="body"
                  className="text-huntly-forest text-center"
                >
                  No teams available yet
                </ThemedText>
              </View>
            ) : (
              <View>
                {teams.map((team) => (
                  <Pressable
                    key={team.id}
                    className={`flex-row items-center p-4 rounded-xl border-2 mb-3 ${
                      selectedTeam === team.id
                        ? "bg-huntly-leaf border-huntly-leaf"
                        : "bg-white border-huntly-mint"
                    }`}
                    onPress={() => setSelectedTeam(team.id)}
                  >
                    <View
                      className="w-8 h-8 rounded-full mr-3"
                      style={{ backgroundColor: team.colour }}
                    />
                    <ThemedText
                      type="defaultSemiBold"
                      className={`flex-1 ${
                        selectedTeam === team.id
                          ? "text-white"
                          : "text-huntly-forest"
                      }`}
                    >
                      {team.name}
                    </ThemedText>
                    {selectedTeam === team.id && (
                      <ThemedText className="text-white text-lg">✓</ThemedText>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Add Player Button */}
          <Pressable
            className="bg-huntly-amber h-14 rounded-xl justify-center items-center mt-4 shadow-soft"
            onPress={handleCreateProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#2D5A27" />
            ) : (
              <ThemedText className="text-huntly-forest font-bold text-lg">
                Add Explorer
              </ThemedText>
            )}
          </Pressable>
        </View>

        {/* Logout Section */}
        <View className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <ThemedText type="subtitle" className="text-huntly-forest mb-4">
            Account Settings
          </ThemedText>

          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-huntly-mint rounded-full items-center justify-center mr-3">
              <ThemedText className="text-huntly-forest text-lg">👤</ThemedText>
            </View>
            <View className="flex-1">
              <ThemedText type="defaultSemiBold" className="text-huntly-forest">
                {user?.email}
              </ThemedText>
              <ThemedText type="caption" className="text-huntly-charcoal">
                Signed in
              </ThemedText>
            </View>
          </View>

          <Pressable
            className="bg-red-500 h-14 rounded-xl justify-center items-center shadow-soft"
            onPress={handleLogout}
          >
            <ThemedText className="text-white font-bold text-lg">
              Logout
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </BaseLayout>
  );
}
