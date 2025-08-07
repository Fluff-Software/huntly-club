import { Pressable, View, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { getPacks, Pack } from "@/services/packService";
import { usePlayer } from "@/contexts/PlayerContext";

export default function PacksScreen() {
  const router = useRouter();
  const { currentPlayer } = usePlayer();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPacks = async () => {
      try {
        const packsData = await getPacks();
        setPacks(packsData);
      } catch (err) {
        setError("Failed to load packs");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPacks();
  }, []);

  const handlePackPress = (packId: string) => {
    // TODO: Navigate to pack details
    console.log("Pack pressed:", packId);
  };

  return (
    <BaseLayout className="bg-huntly-cream">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Welcome Header */}
        <View className="mb-6">
          <ThemedText type="title" className="text-huntly-forest mb-2">
            Welcome back, {currentPlayer?.name || "Explorer"}!
          </ThemedText>

          {/* Character and Message */}
          <View className="flex-row items-center bg-huntly-mint rounded-2xl p-4 mb-6">
            <View className="flex-1">
              <ThemedText type="body" className="text-huntly-forest">
                {currentPlayer?.nickname
                  ? `${currentPlayer.nickname} is ready for adventure!`
                  : "Ready for your next adventure?"}
              </ThemedText>
            </View>
            <View className="w-16 h-16 bg-huntly-amber rounded-full items-center justify-center">
              <ThemedText className="text-2xl">🦊</ThemedText>
            </View>
          </View>
        </View>

        {/* Adventure Packs Section */}
        <View className="mb-8">
          <View className="flex-row items-center mb-6">
            <ThemedText type="subtitle" className="text-huntly-forest">
              ADVENTURE PACKS
            </ThemedText>
            <View className="bg-huntly-amber px-2 py-1 rounded-full ml-2">
              <ThemedText type="caption" className="text-white font-bold">
                NEW
              </ThemedText>
            </View>
          </View>

          {loading ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <ThemedText type="body" className="text-huntly-charcoal">
                Loading adventure packs...
              </ThemedText>
            </View>
          ) : error ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <ThemedText type="body" className="text-huntly-charcoal">
                {error}
              </ThemedText>
            </View>
          ) : (
            <View>
              {packs.map((pack, index) => (
                <Pressable
                  key={pack.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-soft mb-6"
                  onPress={() => handlePackPress(pack.id)}
                >
                  <View className="p-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <ThemedText
                        type="defaultSemiBold"
                        className="text-huntly-forest"
                      >
                        {pack.name}
                      </ThemedText>
                      <View className="bg-huntly-leaf px-3 py-1 rounded-full">
                        <ThemedText
                          type="caption"
                          className="text-white font-semibold"
                        >
                          {index + 1} activities
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText type="body" className="text-huntly-charcoal">
                      Explore nature and discover amazing adventures!
                    </ThemedText>
                  </View>
                </Pressable>
              ))}

              {/* Sample Adventure Packs (for demo) */}
              <Pressable className="bg-huntly-leaf rounded-2xl overflow-hidden shadow-soft mb-6">
                <View className="p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <ThemedText type="defaultSemiBold" className="text-white">
                      Woodland Wonders
                    </ThemedText>
                    <View className="bg-white/20 px-3 py-1 rounded-full">
                      <ThemedText
                        type="caption"
                        className="text-white font-semibold"
                      >
                        3 activities
                      </ThemedText>
                    </View>
                  </View>
                  <View className="w-12 h-12 bg-white/20 rounded-lg items-center justify-center mb-2">
                    <ThemedText className="text-2xl">🌳</ThemedText>
                  </View>
                </View>
              </Pressable>

              <Pressable className="bg-huntly-ocean rounded-2xl overflow-hidden shadow-soft">
                <View className="p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <ThemedText type="defaultSemiBold" className="text-white">
                      Nature Explorers
                    </ThemedText>
                    <View className="bg-white/20 px-3 py-1 rounded-full">
                      <ThemedText
                        type="caption"
                        className="text-white font-semibold"
                      >
                        4 activities
                      </ThemedText>
                    </View>
                  </View>
                  <View className="w-12 h-12 bg-white/20 rounded-lg items-center justify-center mb-2">
                    <ThemedText className="text-2xl">🔍</ThemedText>
                  </View>
                </View>
              </Pressable>
            </View>
          )}
        </View>

        {/* My Badges Section */}
        <View className="mb-6">
          <ThemedText type="subtitle" className="text-huntly-forest mb-4">
            MY BADGES
          </ThemedText>

          <View className="bg-white rounded-2xl p-4 shadow-soft">
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-huntly-sage rounded-full items-center justify-center mr-4">
                <ThemedText className="text-2xl">🐻</ThemedText>
              </View>
              <View className="flex-1">
                <ThemedText
                  type="defaultSemiBold"
                  className="text-huntly-forest"
                >
                  Trail Tracker
                </ThemedText>
                <ThemedText type="caption" className="text-huntly-brown">
                  Earned 1 April 2024
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </BaseLayout>
  );
}
