import React from "react";
import { Pressable, View, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { getPacks, Pack } from "@/services/packService";
import { getPackCompletionPercentage } from "@/services/activityProgressService";
import { usePlayer } from "@/contexts/PlayerContext";
import { XPBar } from "@/components/XPBar";
import { PackProgressBar } from "@/components/PackProgressBar";
import {
  getUserBadges,
  UserBadge,
  getBadgeDisplay,
} from "@/services/badgeService";
import { BadgeDetailModal } from "@/components/BadgeDetailModal";

export default function PacksScreen() {
  const router = useRouter();
  const { currentPlayer, refreshProfiles } = usePlayer();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [packProgress, setPackProgress] = useState<Record<number, number>>({});
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const packsData = await getPacks();
        if (isMounted) {
          setPacks(packsData);

          // Fetch progress for each pack
          if (currentPlayer?.id) {
            const progressData: Record<number, number> = {};
            for (const pack of packsData) {
              try {
                const percentage = await getPackCompletionPercentage(
                  currentPlayer.id,
                  pack.id
                );
                progressData[pack.id] = percentage;
              } catch (err) {
                console.error(
                  `Failed to fetch progress for pack ${pack.id}:`,
                  err
                );
                progressData[pack.id] = 0;
              }
            }
            setPackProgress(progressData);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load packs");
        }
        console.error(err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentPlayer?.id]);

  // Fetch user badges
  useEffect(() => {
    let isMounted = true;

    const fetchUserBadges = async () => {
      if (currentPlayer?.user_id && currentPlayer?.id) {
        try {
          const badges = await getUserBadges(
            currentPlayer.user_id,
            currentPlayer.id
          );
          if (isMounted) {
            setUserBadges(badges);
          }
        } catch (err) {
          console.error("Failed to fetch user badges:", err);
        }
      }
    };

    fetchUserBadges();

    return () => {
      isMounted = false;
    };
  }, [currentPlayer?.user_id, currentPlayer?.id]);

  // Refresh profiles and pack progress when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;

      const refresh = async () => {
        if (isMounted && currentPlayer?.id) {
          await refreshProfiles();

          // Refresh pack progress
          const progressData: Record<number, number> = {};
          for (const pack of packs) {
            try {
              const percentage = await getPackCompletionPercentage(
                currentPlayer.id,
                pack.id
              );
              progressData[pack.id] = percentage;
            } catch (err) {
              console.error(
                `Failed to fetch progress for pack ${pack.id}:`,
                err
              );
              progressData[pack.id] = 0;
            }
          }
          if (isMounted) {
            setPackProgress(progressData);
          }

          // Refresh user badges
          if (currentPlayer?.user_id && currentPlayer?.id) {
            try {
              const badges = await getUserBadges(
                currentPlayer.user_id,
                currentPlayer.id
              );
              if (isMounted) {
                setUserBadges(badges);
              }
            } catch (err) {
              console.error("Failed to fetch user badges:", err);
            }
          }
        }
      };

      refresh();

      return () => {
        isMounted = false;
      };
    }, [refreshProfiles, currentPlayer?.id, currentPlayer?.user_id, packs])
  );

  const handlePackPress = (packId: number) => {
    router.push(`/(tabs)/pack/${packId}`);
  };

  const handleBadgePress = (badge: UserBadge) => {
    setSelectedBadge(badge);
    setShowBadgeModal(true);
  };

  const handleNextBadge = () => {
    if (currentBadgeIndex < userBadges.length - 1) {
      setCurrentBadgeIndex(currentBadgeIndex + 1);
      setSelectedBadge(userBadges[currentBadgeIndex + 1]);
    }
  };

  const handlePrevBadge = () => {
    if (currentBadgeIndex > 0) {
      setCurrentBadgeIndex(currentBadgeIndex - 1);
      setSelectedBadge(userBadges[currentBadgeIndex - 1]);
    }
  };

  const closeBadgeModal = () => {
    setShowBadgeModal(false);
    setSelectedBadge(null);
    setCurrentBadgeIndex(0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
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
          <View className="flex-row items-center bg-huntly-mint rounded-2xl p-4 mb-4">
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

          {/* XP Bar */}
          {currentPlayer && (
            <XPBar
              currentXP={currentPlayer.xp || 0}
              level={Math.floor((currentPlayer.xp || 0) / 100) + 1}
              className="mb-6"
            />
          )}
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
                  className={`rounded-2xl overflow-hidden shadow-soft mb-6 ${
                    packProgress[pack.id] === 100
                      ? "bg-huntly-leaf/10 border-2 border-huntly-leaf/30"
                      : "bg-white"
                  }`}
                  onPress={() => handlePackPress(pack.id)}
                >
                  <View className="p-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center flex-1">
                        <ThemedText
                          type="defaultSemiBold"
                          className="text-huntly-forest"
                        >
                          {pack.name}
                        </ThemedText>
                        {packProgress[pack.id] === 100 && (
                          <View className="ml-2">
                            <ThemedText className="text-2xl">🏆</ThemedText>
                          </View>
                        )}
                      </View>
                      <View className="bg-huntly-leaf px-3 py-1 rounded-full">
                        <ThemedText
                          type="caption"
                          className="text-white font-semibold"
                        >
                          {pack.activities.length} activities
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText
                      type="body"
                      className="text-huntly-charcoal mb-3"
                    >
                      {packProgress[pack.id] === 100
                        ? "🎉 Congratulations! You've completed all activities in this pack!"
                        : "Explore nature and discover amazing adventures!"}
                    </ThemedText>

                    {/* Progress Bar */}
                    <PackProgressBar
                      percentage={packProgress[pack.id] || 0}
                      showCompletionBadge={packProgress[pack.id] === 100}
                      className="mt-2"
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* My Badges Section */}
        <View className="mb-6">
          <ThemedText type="subtitle" className="text-huntly-forest mb-4">
            MY BADGES
          </ThemedText>

          {userBadges.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center shadow-soft">
              <View className="w-16 h-16 bg-huntly-mint/30 rounded-full items-center justify-center mb-4">
                <ThemedText className="text-2xl">🏆</ThemedText>
              </View>
              <ThemedText
                type="subtitle"
                className="text-huntly-forest text-center mb-2"
              >
                No badges yet
              </ThemedText>
              <ThemedText
                type="body"
                className="text-huntly-charcoal text-center"
              >
                Complete activities to earn your first badge!
              </ThemedText>
            </View>
          ) : (
            <View>
              {userBadges.slice(0, 3).map((userBadge, index) => {
                const badgeDisplay = getBadgeDisplay(userBadge.badge);
                return (
                  <Pressable
                    key={userBadge.id}
                    className="bg-white rounded-2xl p-4 shadow-soft mb-4"
                    onPress={() => handleBadgePress(userBadge)}
                  >
                    <View className="flex-row items-center">
                      <View className="w-16 h-16 bg-huntly-sage rounded-full items-center justify-center mr-4">
                        {badgeDisplay.type === "image" ? (
                          <ThemedText className="text-2xl">🏆</ThemedText>
                        ) : (
                          <ThemedText className="text-2xl">
                            {badgeDisplay.content}
                          </ThemedText>
                        )}
                      </View>
                      <View className="flex-1">
                        <ThemedText
                          type="defaultSemiBold"
                          className="text-huntly-forest"
                        >
                          {userBadge.badge.name}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          className="text-huntly-brown"
                        >
                          Earned {formatDate(userBadge.earned_at)}
                        </ThemedText>
                      </View>
                      {/* Navigation Arrow */}
                      {userBadges.length > 1 && (
                        <View className="ml-2">
                          <ThemedText className="text-huntly-charcoal text-lg">
                            →
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
              {userBadges.length > 3 && (
                <View className="bg-huntly-mint/20 rounded-2xl p-4 items-center">
                  <ThemedText
                    type="body"
                    className="text-huntly-forest text-center"
                  >
                    +{userBadges.length - 3} more badges earned!
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Badge Detail Modal */}
      <BadgeDetailModal
        visible={showBadgeModal}
        badge={selectedBadge?.badge || null}
        earnedAt={selectedBadge?.earned_at}
        onClose={closeBadgeModal}
        allBadges={userBadges}
        currentIndex={currentBadgeIndex}
        onNext={handleNextBadge}
        onPrev={handlePrevBadge}
      />
    </BaseLayout>
  );
}
