import React, { useState, useEffect } from "react";
import {
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { Button } from "@/components/ui/Button";
import {
  getTeams,
  getProfiles,
  updateProfile,
  type Profile,
} from "@/services/profileService";
import { generateNickname } from "@/services/nicknameGenerator";
import { getTeamImageSource } from "@/utils/teamUtils";
import { ColorPicker } from "@/components/ui/ColorPicker";

export default function ProfileIdScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("#FF6B35"); // Default to fox orange
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teams, setTeams] = useState<
    { id: number; name: string; colour: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user) return;

      try {
        setLoading(true);
        const [teamsData, profilesData] = await Promise.all([
          getTeams(),
          getProfiles(user.id),
        ]);

        setTeams(teamsData);
        const currentProfile = profilesData.find((p) => p.id === parseInt(id));

        if (currentProfile) {
          setProfile(currentProfile);
          setName(currentProfile.name);
          setNickname(currentProfile.nickname || generateNickname());
          setSelectedColor(currentProfile.colour);
          setSelectedTeam(currentProfile.team);
        } else {
          Alert.alert("Error", "Profile not found");
          router.back();
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        Alert.alert("Error", "Failed to load profile data");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const handleGenerateNickname = () => {
    setNickname(generateNickname());
  };

  const handleSaveProfile = async () => {
    if (!profile || !name.trim() || !nickname.trim() || !selectedTeam) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const updatedProfile = await updateProfile(profile.id, {
        name: name.trim(),
        nickname: nickname.trim(),
        colour: selectedColor,
        team: selectedTeam,
      });

      setProfile(updatedProfile);
      setNickname(updatedProfile.nickname);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update profile";
      Alert.alert("Error", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <BaseLayout className="bg-huntly-cream">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4A7C59" />
          <ThemedText type="body" className="mt-4 text-huntly-charcoal">
            Loading explorer profile...
          </ThemedText>
        </View>
      </BaseLayout>
    );
  }

  if (!profile) {
    return (
      <BaseLayout className="bg-huntly-cream">
        <View className="flex-1 justify-center items-center">
          <ThemedText type="body" className="text-huntly-charcoal">
            Explorer profile not found
          </ThemedText>
        </View>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout className="bg-huntly-cream">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-center mb-6 p-5">
          <ThemedText
            type="title"
            className="text-huntly-forest"
          >
            Edit Explorer
          </ThemedText>
        </View>

        {/* Current Profile Info */}
        <View className="mx-5 mb-6 p-4 bg-white rounded-2xl shadow-soft">
          <View className="flex-row items-center mb-3">
            <View
              style={{ backgroundColor: profile.colour }}
              className="w-12 h-12 rounded-full mr-4 items-center justify-center"
            >
              <ThemedText className="text-white text-lg font-bold">
                {profile.name.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <View className="flex-1">
              <ThemedText type="subtitle" className="text-huntly-forest">
                {profile.name}
              </ThemedText>
              <ThemedText className="text-huntly-leaf font-medium">
                {nickname}
              </ThemedText>
            </View>
          </View>
          <ThemedText className="text-huntly-charcoal">
            Adventure Points: {profile.xp}
          </ThemedText>
        </View>

        {/* Edit Form */}
        <View className="mx-5 space-y-6">
          {/* Player Name */}
          <View>
            <ThemedText type="subtitle" className="text-huntly-forest mb-4">
              Explorer Name
            </ThemedText>
            <TextInput
              className="h-14 border-2 border-huntly-mint rounded-xl px-4 bg-huntly-cream text-huntly-forest text-base"
              placeholder="Explorer Name"
              placeholderTextColor="#8B4513"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Nickname */}
          <View>
            <ThemedText type="subtitle" className="text-huntly-forest mb-4">
              Adventure Nickname
            </ThemedText>
            <View className="mb-3">
              <View className="flex-row items-center mb-3">
                <TextInput
                  className="flex-1 h-14 border-2 border-huntly-mint rounded-xl px-4 bg-huntly-cream text-huntly-forest text-base mr-3"
                  placeholder="Nickname"
                  placeholderTextColor="#8B4513"
                  value={nickname}
                  onChangeText={setNickname}
                  autoCapitalize="words"
                />
                <Button
                  variant="secondary"
                  size="large"
                  onPress={handleGenerateNickname}
                  className="px-4"
                >
                  🎲 Generate
                </Button>
              </View>
              <ThemedText className="text-huntly-brown text-sm">
                Tap Generate to create a random adventure nickname!
              </ThemedText>
            </View>
          </View>

          {/* Color Selection */}
          <View>
            <ThemedText type="subtitle" className="text-huntly-forest mb-4">
              Choose Your Color
            </ThemedText>
            <ColorPicker
              selectedColor={selectedColor}
              onColorSelect={setSelectedColor}
              size="medium"
            />
          </View>

          {/* Team Selection */}
          <View>
            <ThemedText type="subtitle" className="text-huntly-forest mb-4">
              Choose Your Team
            </ThemedText>
            <View>
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
          </View>

          {/* Save Button */}
          <Button
            variant="primary"
            size="large"
            onPress={handleSaveProfile}
            loading={saving}
            className="mt-6"
          >
            Save Changes
          </Button>
        </View>
      </ScrollView>
    </BaseLayout>
  );
}
