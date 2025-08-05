import React, { useState, useEffect } from 'react';
import { TextInput, Alert, ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { BaseLayout } from '@/components/layout/BaseLayout';
import { createProfile, getTeams, getProfiles, type Profile } from '@/services/profileService';

const COLOR_OPTIONS = [
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#008000', // Dark Green
  '#800000', // Maroon
  '#000080', // Navy
  '#808080', // Gray
];

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teams, setTeams] = useState<{ id: number; name: string; colour: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsData, profilesData] = await Promise.all([
          getTeams(),
          user ? getProfiles(user.id) : []
        ]);
        setTeams(teamsData);
        setProfiles(profilesData);
        if (teamsData.length > 0) {
          setSelectedTeam(teamsData[0].id);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load data');
      }
    };
    fetchData();
  }, [user]);

  const handleCreateProfile = async () => {
    if (!name.trim() || !selectedTeam) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a profile');
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
      const updatedProfiles = await getProfiles(user.id);
      setProfiles(updatedProfiles);
      setName('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseLayout>
      <ScrollView contentContainerClassName="p-5">
        <ThemedText type="title" className="text-center mb-6">
          Who's Playing?
        </ThemedText>

        {profiles.length > 0 && (
          <View className="mb-6">
            <ThemedText type="subtitle" className="mb-4">
              Current Players
            </ThemedText>
            {profiles.map((profile) => (
              <View key={profile.id} className="flex-row items-center p-3 border border-gray-200 rounded-lg mb-2">
                <View style={{ backgroundColor: profile.colour }} className="w-5 h-5 rounded-full mr-3" />
                <ThemedText>{profile.name}</ThemedText>
              </View>
            ))}
          </View>
        )}

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
          className="bg-blue-600 h-12 rounded-lg justify-center items-center mt-4"
          onPress={handleCreateProfile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText className="text-white font-semibold text-lg">Add Player</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </BaseLayout>
  );
} 