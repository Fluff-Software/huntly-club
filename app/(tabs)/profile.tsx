import React, { useState, useEffect } from "react";
import {
  TextInput,
  Alert,
  Pressable,
  ScrollView,
  View,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { ThemedText } from "@/components/ThemedText";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { Button } from "@/components/ui/Button";
import {
  createProfile,
  getTeams,
  updateProfile,
  type Profile,
  type Team,
} from "@/services/profileService";
import { generateNickname } from "@/services/nicknameGenerator";
import { XPBar } from "@/components/XPBar";
import { getTeamImageSource } from "@/utils/teamUtils";
import { ColorPicker } from "@/components/ui/ColorPicker";

export default function ProfileScreen() {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("#FF6B35"); // Default to fox orange
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editColor, setEditColor] = useState<string>("#FF6B35");
  const [editTeam, setEditTeam] = useState<number | null>(null);
  const [showAddExplorer, setShowAddExplorer] = useState(false);
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
      setShowAddExplorer(false); // Close the dropdown
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create explorer";
      Alert.alert("Error", errorMessage);
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update explorer";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName("");
    setEditNickname("");
    setEditColor("#FF6B35");
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
                <Button
                  variant="secondary"
                  size="medium"
                  onPress={() => setIsEditing(true)}
                >
                  Edit
                </Button>
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
                    <Button
                      variant="secondary"
                      size="large"
                      onPress={() => setEditNickname(generateNickname())}
                      className="ml-3 px-4"
                    >
                      🎲 Generate
                    </Button>
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
                <View className="mb-6">
                  <ColorPicker
                    selectedColor={editColor}
                    onColorSelect={setEditColor}
                    size="medium"
                  />
                </View>

                {/* Edit Team */}
                <ThemedText
                  type="defaultSemiBold"
                  className="text-huntly-forest mb-4"
                >
                  Choose Your Team
                </ThemedText>
                <View className="mb-6">
                  <View className="flex-row justify-center">
                    {teams.map((team) => {
                      const teamImage = getTeamImageSource(team.name);
                      return (
                        <Pressable
                          key={team.id}
                          onPress={() => setEditTeam(team.id)}
                        >
                          {teamImage ? (
                            <View
                              className={`w-32 h-32 ${
                                editTeam === team.id
                                  ? "border-4 border-huntly-leaf rounded-xl"
                                  : ""
                              }`}
                            >
                              <Image
                                source={teamImage}
                                className="w-full h-full"
                                resizeMode="contain"
                              />
                            </View>
                          ) : (
                            <View
                              className={`w-32 h-32 rounded-full ${
                                editTeam === team.id
                                  ? "border-4 border-huntly-leaf"
                                  : ""
                              }`}
                              style={{
                                backgroundColor: team.colour || "#cccccc",
                              }}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Edit Action Buttons */}
                <View className="flex-row space-x-3">
                  <Button
                    variant="cancel"
                    size="large"
                    onPress={handleCancelEdit}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="large"
                    onPress={handleSaveEdit}
                    loading={loading}
                    className="flex-1"
                  >
                    Save
                  </Button>
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

        {/* Add New Explorer Dropdown */}
        <View className="bg-white rounded-2xl shadow-soft mb-8 overflow-hidden">
          {/* Dropdown Header */}
          <Pressable
            onPress={() => setShowAddExplorer(!showAddExplorer)}
            className="flex-row items-center justify-between p-6"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-huntly-mint rounded-full items-center justify-center mr-3">
                <ThemedText className="text-huntly-forest text-lg">
                  ➕
                </ThemedText>
              </View>
              <View>
                <ThemedText
                  type="defaultSemiBold"
                  className="text-huntly-forest"
                >
                  Add New Explorer
                </ThemedText>
                <ThemedText type="caption" className="text-huntly-charcoal">
                  Create a new explorer profile
                </ThemedText>
              </View>
            </View>
            <View className="w-6 h-6 items-center justify-center">
              <ThemedText className="text-huntly-forest text-lg">
                {showAddExplorer ? "−" : "+"}
              </ThemedText>
            </View>
          </Pressable>

          {/* Dropdown Content */}
          {showAddExplorer && (
            <View className="px-6 pb-6 border-t border-huntly-mint/20">
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
              <View className="mb-6">
                <ColorPicker
                  selectedColor={selectedColor}
                  onColorSelect={setSelectedColor}
                  size="medium"
                />
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
                  <View className="flex-row justify-center">
                    {teams.map((team) => {
                      const teamImage = getTeamImageSource(team.name);
                      return (
                        <Pressable
                          key={team.id}
                          onPress={() => setSelectedTeam(team.id)}
                        >
                          {teamImage ? (
                            <View
                              className={`w-32 h-32 ${
                                selectedTeam === team.id
                                  ? "border-4 border-huntly-leaf rounded-xl"
                                  : ""
                              }`}
                            >
                              <Image
                                source={teamImage}
                                className="w-full h-full"
                                resizeMode="contain"
                              />
                            </View>
                          ) : (
                            <View
                              className={`w-32 h-32 rounded-full ${
                                selectedTeam === team.id
                                  ? "border-4 border-huntly-leaf"
                                  : ""
                              }`}
                              style={{ backgroundColor: team.colour }}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Add Explorer Button */}
              <Button
                variant="primary"
                size="large"
                onPress={handleCreateProfile}
                loading={loading}
                className="mt-4"
              >
                Add Explorer
              </Button>
            </View>
          )}
        </View>

        {/* Parents Dashboard Section */}
        <View className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <ThemedText type="subtitle" className="text-huntly-forest mb-4">
            Parents Dashboard
          </ThemedText>

          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-huntly-mint rounded-full items-center justify-center mr-3">
              <ThemedText className="text-huntly-forest text-lg">👨‍👩‍👧‍👦</ThemedText>
            </View>
            <View className="flex-1">
              <ThemedText type="defaultSemiBold" className="text-huntly-forest">
                Explorer Insights
              </ThemedText>
              <ThemedText type="caption" className="text-huntly-charcoal">
                Track progress and achievements
              </ThemedText>
            </View>
          </View>

          <Button
            variant="secondary"
            size="large"
            onPress={() => router.push("/(tabs)/parents")}
            className="mb-4"
          >
            View Dashboard
          </Button>
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

          <Button variant="danger" size="large" onPress={handleLogout}>
            Logout
          </Button>
        </View>
      </ScrollView>
    </BaseLayout>
  );
}
