import React, { useState, useEffect } from "react";
import { View, ScrollView, Image, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { CategoryTags } from "@/components/CategoryTags";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/supabase";
import { getCategories, getCategoryById } from "@/services/categoriesService";

interface ExplorerStats {
  id: number;
  name: string;
  nickname: string;
  colour: string;
  xp: number;
  team: string;
  totalActivities: number;
  completedActivities: number;
  recentActivities: any[];
  categoryStats: {
    [categoryId: number]: {
      count: number;
      xp: number;
    };
  };
}

interface CategoryAnalytics {
  categoryId: number;
  label: string;
  icon: string | null;
  totalActivities: number;
  totalXp: number;
  explorerCount: number;
}

export default function ParentsScreen() {
  const { currentPlayer } = usePlayer();
  const { user } = useAuth();
  const [explorers, setExplorers] = useState<ExplorerStats[]>([]);
  const [categoryAnalytics, setCategoryAnalytics] = useState<
    CategoryAnalytics[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [totalXp, setTotalXp] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [categoriesList, setCategoriesList] = useState<Awaited<ReturnType<typeof getCategories>>>([]);

  useEffect(() => {
    if (!user?.id) return;
    fetchExplorersData();
  }, [user?.id]);

  const fetchExplorersData = async () => {
    try {
      setLoading(true);

      // Get all profiles for the current user
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          name,
          nickname,
          colour,
          xp,
          team,
          teams(name)
        `
        )
        .eq("user_id", user!.id);

      if (profilesError) throw profilesError;

      const categories = await getCategories();
      setCategoriesList(categories);
      const explorerStats: ExplorerStats[] = [];
      let totalXpSum = 0;
      let totalActivitiesSum = 0;
      const categoryStatsMap: {
        [categoryId: number]: {
          count: number;
          xp: number;
          explorers: Set<number>;
        };
      } = {};

      for (const profile of profiles || []) {
        // Get recent activities for this explorer
        const { data: activities, error: activitiesError } = await supabase
          .from("user_activity_progress")
          .select(
            `
            id,
            completed_at,
            activities(
              id,
              title,
              xp,
              categories
            )
          `
          )
          .eq("profile_id", profile.id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(5);

        if (activitiesError) {
          console.error("Error fetching activities:", activitiesError);
          continue;
        }

        const completedActivities = activities ?? [];
        const totalActivitiesForExplorer = activities?.length || 0;
        const completedCount = completedActivities.length;
        const explorerXp = profile.xp || 0;

        totalXpSum += explorerXp;
        totalActivitiesSum += completedCount;

        // Calculate category stats for this explorer (categories are now ids)
        const explorerCategoryStats: {
          [categoryId: number]: { count: number; xp: number };
        } = {};

        completedActivities.forEach((activity) => {
          const activityData = Array.isArray(activity.activities)
            ? activity.activities[0]
            : activity.activities;
          const activityCategoryIds = Array.isArray(activityData?.categories)
            ? (activityData.categories as number[]).filter((x): x is number => typeof x === "number" && x > 0)
            : [];
          const activityXp = activityData?.xp || 0;

          activityCategoryIds.forEach((categoryId: number) => {
            if (!categoryStatsMap[categoryId]) {
              categoryStatsMap[categoryId] = { count: 0, xp: 0, explorers: new Set() };
            }
            categoryStatsMap[categoryId].count += 1;
            categoryStatsMap[categoryId].xp += activityXp;
            categoryStatsMap[categoryId].explorers.add(profile.id);
            if (!explorerCategoryStats[categoryId]) {
              explorerCategoryStats[categoryId] = { count: 0, xp: 0 };
            }
            explorerCategoryStats[categoryId].count += 1;
            explorerCategoryStats[categoryId].xp += activityXp;
          });
        });

        explorerStats.push({
          id: profile.id,
          name: profile.name,
          nickname: profile.nickname || profile.name,
          colour: profile.colour,
          xp: explorerXp,
          team: (profile.teams as any)?.name || "No Team",
          totalActivities: totalActivitiesForExplorer,
          completedActivities: completedCount,
          recentActivities: activities || [],
          categoryStats: explorerCategoryStats,
        });
      }

      // Convert category stats to analytics format from DB categories
      const analytics: CategoryAnalytics[] = categories
        .map((cat) => ({
          categoryId: cat.id,
          label: cat.name ?? `Category ${cat.id}`,
          icon: cat.icon,
          totalActivities: categoryStatsMap[cat.id]?.count || 0,
          totalXp: categoryStatsMap[cat.id]?.xp || 0,
          explorerCount: categoryStatsMap[cat.id]?.explorers.size || 0,
        }))
        .filter((a) => a.totalActivities > 0)
        .sort((a, b) => b.totalActivities - a.totalActivities);

      setExplorers(explorerStats);
      setCategoryAnalytics(analytics);
      setTotalXp(totalXpSum);
      setTotalActivities(totalActivitiesSum);
    } catch (error) {
      console.error("Error fetching explorers data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  if (loading) {
    return (
      <BaseLayout>
        <ThemedView className="flex-1 justify-center items-center p-6">
          <View className="w-20 h-20 bg-huntly-mint rounded-full items-center justify-center mb-6">
            <View className="w-8 h-8 border-2 border-huntly-leaf border-t-transparent rounded-full animate-spin" />
          </View>
          <ThemedText
            type="subtitle"
            className="text-huntly-forest text-center"
          >
            Loading explorer insights...
          </ThemedText>
        </ThemedView>
      </BaseLayout>
    );
  }

  if (!user) {
    return (
      <BaseLayout>
        <ThemedView className="flex-1 justify-center items-center p-6">
          <View className="w-20 h-20 bg-huntly-mint rounded-full items-center justify-center mb-6">
            <ThemedText className="text-3xl">🔒</ThemedText>
          </View>
          <ThemedText
            type="title"
            className="text-huntly-forest text-center mb-4"
          >
            Access Denied
          </ThemedText>
          <ThemedText type="body" className="text-huntly-charcoal text-center">
            Please sign in to view explorer insights
          </ThemedText>
        </ThemedView>
      </BaseLayout>
    );
  }

  if (explorers.length === 0) {
    return (
      <BaseLayout>
        <ThemedView className="flex-1 justify-center items-center p-6">
          <View className="w-20 h-20 bg-huntly-mint rounded-full items-center justify-center mb-6">
            <ThemedText className="text-3xl">👥</ThemedText>
          </View>
          <ThemedText
            type="title"
            className="text-huntly-forest text-center mb-4"
          >
            No Explorers Found
          </ThemedText>
          <ThemedText type="body" className="text-huntly-charcoal text-center">
            Create some explorers to see their progress and insights
          </ThemedText>
        </ThemedView>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="p-6 pb-4">
          <ThemedText type="title" className="text-huntly-forest mb-2">
            Explorer Insights
          </ThemedText>
          <ThemedText type="subtitle" className="text-huntly-charcoal mb-6">
            Track your explorers' progress and achievements
          </ThemedText>

          {/* Overall Stats Card */}
          <View className="bg-gradient-to-br from-huntly-mint to-huntly-sage rounded-2xl p-6 mb-6 shadow-soft">
            <View className="flex-row justify-between items-center mb-4">
              <ThemedText type="subtitle" className="text-huntly-forest">
                Total Progress
              </ThemedText>
              <View className="bg-white/20 rounded-full px-3 py-1">
                <ThemedText
                  type="defaultSemiBold"
                  className="text-huntly-forest"
                >
                  {explorers.length} Explorers
                </ThemedText>
              </View>
            </View>

            <View className="flex-row justify-between">
              <View className="items-center">
                <ThemedText type="title" className="text-huntly-forest">
                  {totalXp}
                </ThemedText>
                <ThemedText type="caption" className="text-huntly-charcoal">
                  Total XP
                </ThemedText>
              </View>
              <View className="items-center">
                <ThemedText type="title" className="text-huntly-forest">
                  {totalActivities}
                </ThemedText>
                <ThemedText type="caption" className="text-huntly-charcoal">
                  Activities
                </ThemedText>
              </View>
              <View className="items-center">
                <ThemedText type="title" className="text-huntly-forest">
                  {categoryAnalytics.length}
                </ThemedText>
                <ThemedText type="caption" className="text-huntly-charcoal">
                  Categories
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Category Analytics */}
        {categoryAnalytics.length > 0 && (
          <View className="px-6 mb-6">
            <ThemedText type="subtitle" className="text-huntly-forest mb-4">
              Most Popular Categories
            </ThemedText>

            {categoryAnalytics.slice(0, 5).map((category, index) => (
              <View
                key={category.categoryId}
                className={`bg-white rounded-2xl p-4 mb-3 shadow-soft border border-huntly-mint/20 ${
                  index === 0 ? "border-2 border-yellow-400" : ""
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className="w-12 h-12 rounded-full items-center justify-center mr-3 overflow-hidden"
                      style={{ backgroundColor: "#E5E7EB" }}
                    >
                      {category.icon ? (
                        <Image
                          source={{ uri: category.icon }}
                          className="w-12 h-12"
                          resizeMode="cover"
                        />
                      ) : (
                        <MaterialIcons name="label" size={24} color="#6B7280" />
                      )}
                    </View>
                    <View className="flex-1">
                      <ThemedText
                        type="defaultSemiBold"
                        className="text-huntly-forest"
                      >
                        {category.label}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        className="text-huntly-charcoal"
                      >
                        {category.explorerCount} explorer
                        {category.explorerCount !== 1 ? "s" : ""}
                      </ThemedText>
                    </View>
                  </View>
                  <View className="items-end">
                    <ThemedText
                      type="defaultSemiBold"
                      className="text-huntly-forest"
                    >
                      {category.totalActivities}
                    </ThemedText>
                    <ThemedText type="caption" className="text-huntly-charcoal">
                      +{category.totalXp} XP
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Individual Explorers */}
        <View className="px-6 pb-6">
          <ThemedText type="subtitle" className="text-huntly-forest mb-4">
            Your Explorers
          </ThemedText>

          {explorers.map((explorer, index) => (
            <View
              key={explorer.id}
              className={`bg-white rounded-2xl p-6 mb-4 shadow-soft border border-huntly-mint/20 ${
                index < explorers.length - 1 ? "mb-4" : ""
              }`}
            >
              {/* Explorer Header */}
              <View className="flex-row items-center mb-4">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: explorer.colour }}
                >
                  <ThemedText className="text-2xl text-white font-bold">
                    {explorer.nickname.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View className="flex-1">
                  <ThemedText
                    type="defaultSemiBold"
                    className="text-huntly-forest text-lg"
                  >
                    {explorer.nickname}
                  </ThemedText>
                  <ThemedText type="caption" className="text-huntly-charcoal">
                    Team {explorer.team}
                  </ThemedText>
                </View>
                <View className="bg-huntly-leaf px-3 py-1 rounded-full">
                  <ThemedText type="caption" className="text-white font-bold">
                    {explorer.xp} XP
                  </ThemedText>
                </View>
              </View>

              {/* Explorer Stats */}
              <View className="flex-row justify-between mb-4">
                <View className="items-center">
                  <ThemedText
                    type="defaultSemiBold"
                    className="text-huntly-forest"
                  >
                    {explorer.completedActivities}
                  </ThemedText>
                  <ThemedText type="caption" className="text-huntly-charcoal">
                    Completed
                  </ThemedText>
                </View>
                <View className="items-center">
                  <ThemedText
                    type="defaultSemiBold"
                    className="text-huntly-forest"
                  >
                    {explorer.totalActivities}
                  </ThemedText>
                  <ThemedText type="caption" className="text-huntly-charcoal">
                    Total
                  </ThemedText>
                </View>
                <View className="items-center">
                  <ThemedText
                    type="defaultSemiBold"
                    className="text-huntly-forest"
                  >
                    {Object.keys(explorer.categoryStats).length}
                  </ThemedText>
                  <ThemedText type="caption" className="text-huntly-charcoal">
                    Categories
                  </ThemedText>
                </View>
              </View>

              {/* Top Categories */}
              {Object.keys(explorer.categoryStats).length > 0 && (
                <View className="mb-4">
                  <ThemedText
                    type="caption"
                    className="text-huntly-charcoal mb-2"
                  >
                    Top Categories
                  </ThemedText>
                  <CategoryTags
                    categoryInfos={Object.keys(explorer.categoryStats)
                      .slice(0, 3)
                      .map((idStr) => getCategoryById(categoriesList, Number(idStr)))
                      .filter((c): c is NonNullable<typeof c> => c != null)
                      .map((c) => ({ id: c.id, name: c.name, icon: c.icon }))}
                    size="small"
                    maxDisplay={3}
                  />
                </View>
              )}

              {/* Recent Activities */}
              {explorer.recentActivities.length > 0 && (
                <View>
                  <ThemedText
                    type="caption"
                    className="text-huntly-charcoal mb-2"
                  >
                    Recent Activities
                  </ThemedText>
                  {explorer.recentActivities
                    .slice(0, 3)
                    .map((activity, activityIndex) => (
                      <View
                        key={activity.id}
                        className="flex-row items-center justify-between py-2"
                      >
                        <View className="flex-row items-center flex-1">
                          <View
                            className={`w-2 h-2 rounded-full mr-3 ${
                              activity.completed_at != null
                                ? "bg-green-500"
                                : "bg-blue-500"
                            }`}
                          />
                          <ThemedText
                            type="caption"
                            className="text-huntly-forest flex-1"
                          >
                            {activity.activities?.title}
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          className="text-huntly-charcoal"
                        >
                          {activity.completed_at
                            ? formatTimeAgo(activity.completed_at)
                            : "In progress"}
                        </ThemedText>
                      </View>
                    ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </BaseLayout>
  );
}
