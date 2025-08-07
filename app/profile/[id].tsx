import React, { useState, useEffect } from "react";
import {
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { BaseLayout } from "@/components/layout/BaseLayout";
import {
  getTeams,
  getProfiles,
  updateProfile,
  type Profile,
} from "@/services/profileService";
import { generateNickname } from "@/services/nicknameGenerator";

const COLOR_OPTIONS = [
  "#FF0000", // Red
  "#00FF00", // Green
  "#0000FF", // Blue
  "#FFFF00", // Yellow
  "#FF00FF", // Magenta
  "#00FFFF", // Cyan
  "#FFA500", // Orange
  "#800080", // Purple
  "#008000", // Dark Green
  "#800000", // Maroon
  "#000080", // Navy
  "#808080", // Gray
];

export default function ProfileIdScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
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
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <BaseLayout>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" />
          <ThemedText className="mt-4">Loading profile...</ThemedText>
        </View>
      </BaseLayout>
    );
  }

  if (!profile) {
    return (
      <BaseLayout>
        <View className="flex-1 justify-center items-center">
          <ThemedText>Profile not found</ThemedText>
        </View>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <ScrollView contentContainerClassName="p-5">
        <View className="flex-row items-center mb-6">
          <Pressable onPress={() => router.back()} className="mr-4">
            <ThemedText className="text-blue-600 text-lg">← Back</ThemedText>
          </Pressable>
          <ThemedText type="title" className="flex-1 text-center">
            Edit Profile
          </ThemedText>
        </View>

        <View className="mb-6 p-4 bg-gray-50 rounded-lg">
          <View className="flex-row items-center mb-3">
            <View
              style={{ backgroundColor: profile.colour }}
              className="w-8 h-8 rounded-full mr-3"
            />
            <View className="flex-1">
              <ThemedText type="subtitle">{profile.name}</ThemedText>
              <ThemedText className="text-purple-600 font-medium">
                {nickname}
              </ThemedText>
            </View>
          </View>
          <ThemedText className="text-gray-600">XP: {profile.xp}</ThemedText>
        </View>

        <ThemedText type="subtitle" className="mb-4">
          Player Name
        </ThemedText>
        <TextInput
          className="h-12 mb-6 border border-gray-300 rounded-lg px-4 bg-white"
          placeholder="Player Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <ThemedText type="subtitle" className="mb-4">
          Nickname
        </ThemedText>
        <View className="mb-6">
          <View className="flex-row items-center mb-3">
            <TextInput
              className="flex-1 h-12 border border-gray-300 rounded-lg px-4 bg-white mr-3"
              placeholder="Nickname"
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="words"
            />
            <Pressable
              className="bg-purple-600 h-12 px-4 rounded-lg justify-center items-center"
              onPress={handleGenerateNickname}
            >
              <ThemedText className="text-white font-medium">
                🎲 Generate
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText className="text-gray-500 text-sm">
            Tap Generate to create a random nickname!
          </ThemedText>
        </View>

        <ThemedText type="subtitle" className="mb-4">
          Choose Your Color
        </ThemedText>
        <View className="flex-row flex-wrap mb-6 px-1">
          {COLOR_OPTIONS.map((color) => (
            <Pressable
              key={color}
              className={`w-10 h-10 rounded-full mr-3 mb-3 ${
                selectedColor === color ? "border-4 border-black" : ""
              }`}
              style={{ backgroundColor: color }}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>

        <ThemedText type="subtitle" className="mb-4">
          Choose Your Team
        </ThemedText>
        <View className="mb-6">
          {teams.length === 0 ? (
            <ThemedText className="text-center text-gray-500">
              No teams available
            </ThemedText>
          ) : (
            teams.map((team) => (
              <Pressable
                key={team.id}
                className={`flex-row items-center p-4 border rounded-lg mb-2`}
                style={
                  selectedTeam === team.id
                    ? { backgroundColor: team.colour, borderColor: team.colour }
                    : { borderColor: "#d1d5db" }
                }
                onPress={() => setSelectedTeam(team.id)}
              >
                <View
                  className="w-5 h-5 rounded-full mr-3"
                  style={{ backgroundColor: team.colour }}
                />
                <ThemedText
                  className={`text-center flex-1 ${
                    selectedTeam === team.id ? "text-white font-bold" : ""
                  }`}
                >
                  {team.name}
                </ThemedText>
              </Pressable>
            ))
          )}
        </View>

        <Pressable
          className="bg-blue-600 h-12 rounded-lg justify-center items-center mt-4"
          onPress={handleSaveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText className="text-white font-semibold text-lg">
              Save Changes
            </ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </BaseLayout>
  );
}
