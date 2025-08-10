import React, { useState, useEffect } from "react";
import {
  TextInput,
  Alert,
  Pressable,
  ScrollView,
  View,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { createProfile, getTeams } from "@/services/profileService";
import { Button } from "@/components/ui/Button";

const COLOR_OPTIONS = [
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFA500",
  "#800080",
  "#008000",
  "#800000",
  "#000080",
  "#808080",
];

export default function CreateProfileScreen() {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teams, setTeams] = useState<
    { id: number; name: string; colour: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsData = await getTeams();
        setTeams(teamsData);
        if (teamsData.length > 0) {
          setSelectedTeam(teamsData[0].id);
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
        Alert.alert("Error", "Failed to load teams");
      }
    };
    fetchTeams();
  }, []);

  const resetForm = () => {
    setName("");
    setSelectedColor(COLOR_OPTIONS[0]);
    setSelectedTeam(teams[0]?.id ?? null);
  };

  const handleAddPlayer = () => {
    if (!name.trim() || !selectedTeam) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    const teamObj = teams.find((t) => t.id === selectedTeam);
    setPlayers([
      ...players,
      {
        name: name.trim(),
        colour: selectedColor,
        team: selectedTeam,
        teamName: teamObj?.name,
        teamColour: teamObj?.colour,
      },
    ]);
    resetForm();
  };

  const handleDeletePlayer = (idx: number) => {
    setPlayers(players.filter((_, i) => i !== idx));
  };

  const handleContinue = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to continue");
      return;
    }
    setLoading(true);
    try {
      for (const player of players) {
        await createProfile({
          user_id: user.id,
          name: player.name,
          colour: player.colour,
          team: player.team,
        });
      }
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save players");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseLayout>
      <View className="flex-1">
        <ScrollView contentContainerClassName="p-5 pb-28">
          <ThemedText type="title" className="text-center mb-6">
            Who's Playing?
          </ThemedText>

          {/* Player Cards */}
          {players.map((player, idx) => (
            <View
              key={idx}
              className="flex-row items-center bg-white rounded-lg p-4 mb-3 shadow border border-gray-200"
            >
              <View className="flex-1 flex-row items-center">
                <View
                  className="w-5 h-5 rounded-full mr-3"
                  style={{ backgroundColor: player.colour }}
                />
                <ThemedText className="font-semibold mr-2">
                  {player.name}
                </ThemedText>
                <View
                  className="w-4 h-4 rounded-full mr-1"
                  style={{ backgroundColor: player.teamColour }}
                />
                <ThemedText className="text-xs text-gray-700">
                  {player.teamName}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => handleDeletePlayer(idx)}
                className="ml-4 p-2 rounded-full bg-red-100 active:bg-red-200"
              >
                <ThemedText className="text-2xl text-red-500 font-bold">
                  ×
                </ThemedText>
              </Pressable>
            </View>
          ))}

          {/* Add Player Card */}
          <View className="bg-white rounded-lg p-4 mb-6 shadow border border-gray-200">
            <ThemedText type="subtitle" className="mb-4">
              Add New Player
            </ThemedText>
            <TextInput
              className="h-12 mb-6 border border-gray-300 rounded-lg px-4 bg-white"
              placeholder="Player Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
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
                <View className="flex-row justify-center">
                  {teams.map((team) => {
                    // Map team names to image assets
                    const getTeamImage = (teamName: string) => {
                      switch (teamName.toLowerCase()) {
                        case "foxes":
                          return require("@/assets/images/fox.png");
                        case "bears":
                          return require("@/assets/images/bear.png");
                        case "otters":
                          return require("@/assets/images/otter.png");
                        default:
                          return null;
                      }
                    };

                    return (
                      <Pressable
                        key={team.id}
                        onPress={() => setSelectedTeam(team.id)}
                      >
                        {getTeamImage(team.name) ? (
                          <View
                            className={`w-32 h-32 ${
                              selectedTeam === team.id
                                ? "border-4 border-huntly-leaf rounded-xl"
                                : ""
                            }`}
                          >
                            <Image
                              source={getTeamImage(team.name)}
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
            <Button
              variant="secondary"
              size="large"
              onPress={handleAddPlayer}
              loading={loading}
              className="mt-2 bg-blue-600"
            >
              Add Player
            </Button>
          </View>
        </ScrollView>
        {/* Sticky Continue Button */}
        <View className="absolute left-0 right-0 bottom-0 p-5 bg-white border-t border-gray-200">
          <Button
            variant={players.length > 0 ? "secondary" : "cancel"}
            size="large"
            onPress={handleContinue}
            loading={loading}
            disabled={players.length === 0}
            className={players.length > 0 ? "bg-blue-600" : "bg-gray-300"}
          >
            Continue
          </Button>
        </View>
      </View>
    </BaseLayout>
  );
}
