import React, { useState, useEffect } from 'react';
import { TextInput, Alert, ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { BaseLayout } from '@/components/layout/BaseLayout';
import { createProfile, getTeams } from '@/services/profileService';

const COLOR_OPTIONS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#008000', '#800000', '#000080', '#808080',
];

export default function CreateProfileScreen() {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teams, setTeams] = useState<{ id: number; name: string; colour: string }[]>([]);
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
        console.error('Error fetching teams:', error);
        Alert.alert('Error', 'Failed to load teams');
      }
    };
    fetchTeams();
  }, []);

  const resetForm = () => {
    setName('');
    setSelectedColor(COLOR_OPTIONS[0]);
    setSelectedTeam(teams[0]?.id ?? null);
  };

  const handleAddPlayer = () => {
    if (!name.trim() || !selectedTeam) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    const teamObj = teams.find(t => t.id === selectedTeam);
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
      Alert.alert('Error', 'You must be logged in to continue');
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
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save players');
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
            <View key={idx} className="flex-row items-center bg-white rounded-lg p-4 mb-3 shadow border border-gray-200">
              <View className="flex-1 flex-row items-center">
                <View className="w-5 h-5 rounded-full mr-3" style={{ backgroundColor: player.colour }} />
                <ThemedText className="font-semibold mr-2">{player.name}</ThemedText>
                <View className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: player.teamColour }} />
                <ThemedText className="text-xs text-gray-700">{player.teamName}</ThemedText>
              </View>
              <Pressable onPress={() => handleDeletePlayer(idx)} className="ml-4 p-2 rounded-full bg-red-100 active:bg-red-200">
                <ThemedText className="text-2xl text-red-500 font-bold">×</ThemedText>
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
                  className={`w-10 h-10 rounded-full mr-3 mb-3 ${selectedColor === color ? 'border-4 border-black' : ''}`}
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
                <ThemedText className="text-center text-gray-500">No teams available</ThemedText>
              ) : (
                teams.map((team) => (
                  <Pressable
                    key={team.id}
                    className={`flex-row items-center p-4 border rounded-lg mb-2`}
                    style={selectedTeam === team.id ? { backgroundColor: team.colour, borderColor: team.colour } : { borderColor: '#d1d5db' }}
                    onPress={() => setSelectedTeam(team.id)}
                  >
                    <View className="w-5 h-5 rounded-full mr-3" style={{ backgroundColor: team.colour }} />
                    <ThemedText className={`text-center flex-1 ${selectedTeam === team.id ? 'text-white font-bold' : ''}`}>
                      {team.name}
                    </ThemedText>
                  </Pressable>
                ))
              )}
            </View>
            <Pressable
              className="bg-blue-600 h-12 rounded-lg justify-center items-center mt-2"
              onPress={handleAddPlayer}
              disabled={loading}
            >
              <ThemedText className="text-white font-semibold text-lg">Add Player</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
        {/* Sticky Continue Button */}
        <View className="absolute left-0 right-0 bottom-0 p-5 bg-white border-t border-gray-200">
          <Pressable
            className={`h-12 rounded-lg justify-center items-center ${players.length > 0 ? 'bg-blue-600' : 'bg-gray-300'}`}
            onPress={handleContinue}
            disabled={loading || players.length === 0}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText className="text-white font-semibold text-lg">Continue</ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </BaseLayout>
  );
} 