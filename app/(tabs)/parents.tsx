import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { StatCard } from "@/components/StatCard";
import { ParentPinModal } from "@/components/ParentPinModal";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useFocusEffect } from "expo-router";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { supabase } from "@/services/supabase";
import { ACTIVITY_CATEGORIES } from "@/types/activity";
import { MaterialIcons } from "@expo/vector-icons";

const COLORS = {
  darkGreen: "#4F6F52",
  cream: "#F8F7F4",
  white: "#FFFFFF",
  black: "#000000",
  charcoal: "#333333",
  cardGray: "#E8E8E8",
};

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
    [category: string]: { count: number; xp: number };
  };
}

interface CategoryAnalytics {
  category: string;
  label: string;
  icon: string;
  color: string;
  totalActivities: number;
  totalXp: number;
  explorerCount: number;
}

export default function ParentsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { scaleW, scaleH } = useLayoutScale();
  const [explorers, setExplorers] = useState<ExplorerStats[]>([]);
  const [categoryAnalytics, setCategoryAnalytics] = useState<
    CategoryAnalytics[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [totalXp, setTotalXp] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [daysPlayed, setDaysPlayed] = useState(0);
  const [showPinModal, setShowPinModal] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (isAuthenticated) {
      fetchExplorersData();
    }
  }, [user?.id, isAuthenticated]);

  useFocusEffect(
    React.useCallback(() => {
      setShowPinModal(true);
      setIsAuthenticated(false);
    }, [])
  );

  const fetchExplorersData = async () => {
    try {
      setLoading(true);

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

      const explorerStats: ExplorerStats[] = [];
      let totalXpSum = 0;
      let totalActivitiesSum = 0;
      const categoryStatsMap: {
        [category: string]: {
          count: number;
          xp: number;
          explorers: Set<number>;
        };
      } = {};
      const completedDates = new Set<string>();

      ACTIVITY_CATEGORIES.forEach((cat) => {
        categoryStatsMap[cat.category] = {
          count: 0,
          xp: 0,
          explorers: new Set(),
        };
      });

      for (const profile of profiles || []) {
        const { data: activities, error: activitiesError } = await supabase
          .from("user_activity_progress")
          .select(
            `
            id,
            status,
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
          .eq("status", "completed");

        if (activitiesError) {
          console.error("Error fetching activities:", activitiesError);
          continue;
        }

        const completedActivities =
          activities?.filter((a) => a.status === "completed") || [];
        completedActivities.forEach((a) => {
          if (a.completed_at) {
            completedDates.add(a.completed_at.slice(0, 10));
          }
        });

        const completedCount = completedActivities.length;
        const explorerXp = profile.xp || 0;

        totalXpSum += explorerXp;
        totalActivitiesSum += completedCount;

        const explorerCategoryStats: {
          [category: string]: { count: number; xp: number };
        } = {};

        completedActivities.forEach((activity) => {
          const activityData = Array.isArray(activity.activities)
            ? activity.activities[0]
            : activity.activities;
          const activityCategories = activityData?.categories || [];
          const activityXp = activityData?.xp || 0;

          activityCategories.forEach((category: string) => {
            if (categoryStatsMap[category]) {
              categoryStatsMap[category].count += 1;
              categoryStatsMap[category].xp += activityXp;
              categoryStatsMap[category].explorers.add(profile.id);
            }
            if (!explorerCategoryStats[category]) {
              explorerCategoryStats[category] = { count: 0, xp: 0 };
            }
            explorerCategoryStats[category].count += 1;
            explorerCategoryStats[category].xp += activityXp;
          });
        });

        const recentFive = (activities || []).slice(0, 5);
        explorerStats.push({
          id: profile.id,
          name: profile.name,
          nickname: profile.nickname || profile.name,
          colour: profile.colour,
          xp: explorerXp,
          team: (profile.teams as any)?.name || "No Team",
          totalActivities: activities?.length || 0,
          completedActivities: completedCount,
          recentActivities: recentFive,
          categoryStats: explorerCategoryStats,
        });
      }

      const analytics: CategoryAnalytics[] = ACTIVITY_CATEGORIES.map((cat) => ({
        category: cat.category,
        label: cat.label,
        icon: cat.icon,
        color: cat.color,
        totalActivities: categoryStatsMap[cat.category]?.count || 0,
        totalXp: categoryStatsMap[cat.category]?.xp || 0,
        explorerCount: categoryStatsMap[cat.category]?.explorers.size || 0,
      }))
        .filter((a) => a.totalActivities > 0)
        .sort((a, b) => b.totalActivities - a.totalActivities);

      setExplorers(explorerStats);
      setCategoryAnalytics(analytics);
      setTotalXp(totalXpSum);
      setTotalActivities(totalActivitiesSum);
      setDaysPlayed(completedDates.size);
    } catch (error) {
      console.error("Error fetching explorers data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    setIsAuthenticated(true);
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setIsAuthenticated(false);
    router.back();
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: COLORS.darkGreen,
        },
        scrollView: { flex: 1 },
        scrollContent: {
          paddingHorizontal: scaleW(30),
          paddingTop: scaleH(16),
          paddingBottom: scaleH(32),
        },
        sectionTitle: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: COLORS.white,
          marginBottom: scaleH(12),
        },
        sectionDesc: {
          fontSize: scaleW(14),
          color: COLORS.white,
          marginBottom: scaleH(16),
        },
        progressGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: scaleW(24),
          marginBottom: scaleH(24),
        },
        activityCard: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: COLORS.cardGray,
          paddingVertical: scaleH(14),
          paddingHorizontal: scaleW(16),
          marginBottom: scaleH(10),
        },
        activityCardLeft: {
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
        },
        activityIconWrap: {
          width: scaleW(40),
          height: scaleH(40),
          borderRadius: scaleW(20),
          backgroundColor: "rgba(0,0,0,0.06)",
          alignItems: "center",
          justifyContent: "center",
          marginRight: scaleW(12),
        },
        activityIconText: {
          fontSize: scaleW(20),
        },
        activityCategoryName: {
          fontSize: scaleW(15),
          color: COLORS.charcoal,
        },
        activityCountWrap: {
          alignItems: "flex-end",
        },
        activityCountNum: {
          fontSize: scaleW(15),
          fontWeight: "700",
          color: COLORS.charcoal,
        },
        activityCountLabel: {
          fontSize: scaleW(13),
          color: COLORS.charcoal,
        },
        resourceCard: {
          backgroundColor: COLORS.cardGray,
          padding: scaleW(16),
          marginBottom: scaleH(12),
        },
        resourceTitle: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: COLORS.charcoal,
          marginBottom: scaleH(6),
        },
        resourceDesc: {
          fontSize: scaleW(14),
          color: COLORS.charcoal,
          marginBottom: scaleH(12),
        },
        resourceButton: {
          flexDirection: "row",
          alignSelf: "flex-end",
          alignItems: "center",
          backgroundColor: COLORS.cream,
          paddingVertical: scaleH(10),
          paddingHorizontal: scaleW(16),
          borderRadius: scaleW(24),
          gap: scaleW(6),
        },
        resourceButtonText: {
          fontSize: scaleW(14),
          fontWeight: "600",
          color: COLORS.charcoal,
        },
        settingsButton: {
          width: scaleW(240),
          backgroundColor: COLORS.cream,
          borderRadius: scaleW(24),
          paddingVertical: scaleH(14),
          paddingHorizontal: scaleW(24),
          alignItems: "center",
          marginTop: scaleH(8),
        },
        settingsButtonText: {
          fontSize: scaleW(16),
          fontWeight: "600",
        },
        loadingWrap: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: scaleW(24),
        },
        loadingSpinner: {
          width: scaleW(48),
          height: scaleH(48),
          marginBottom: scaleH(16),
        },
        loadingText: {
          fontSize: scaleW(16),
          color: COLORS.white,
        },
        emptyWrap: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: scaleW(24),
        },
        emptyIcon: {
          width: scaleW(64),
          height: scaleH(64),
          borderRadius: scaleW(32),
          backgroundColor: "rgba(255,255,255,0.2)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: scaleH(16),
        },
        emptyTitle: {
          fontSize: scaleW(18),
          fontWeight: "700",
          color: COLORS.white,
          marginBottom: scaleH(8),
          textAlign: "center",
        },
        emptyDesc: {
          fontSize: scaleW(14),
          color: COLORS.white,
          opacity: 0.9,
          textAlign: "center",
        },
      }),
    [scaleW, scaleH]
  );

  if (loading && isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator
            size="large"
            color={COLORS.white}
            style={styles.loadingSpinner}
          />
          <ThemedText style={styles.loadingText}>
            Loading explorer insights...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <ThemedText style={{ fontSize: scaleW(28) }}>🔒</ThemedText>
          </View>
          <ThemedText style={styles.emptyTitle}>Access Denied</ThemedText>
          <ThemedText style={styles.emptyDesc}>
            Please sign in to view explorer insights
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (showPinModal) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator
            size="large"
            color={COLORS.white}
            style={styles.loadingSpinner}
          />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
        <ParentPinModal
          visible={showPinModal}
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
        />
      </SafeAreaView>
    );
  }

  if (explorers.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <ThemedText style={{ fontSize: scaleW(28) }}>👥</ThemedText>
          </View>
          <ThemedText style={styles.emptyTitle}>No Explorers Found</ThemedText>
          <ThemedText style={styles.emptyDesc}>
            Create some explorers to see their progress and insights
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const summaryStats: { value: number; label: string; color: "pink" | "green" | "purple" | "cream" }[] = [
    { value: totalActivities, label: "Activities completed", color: "purple" },
    { value: categoryAnalytics.length, label: "Skill areas", color: "cream" },
    { value: daysPlayed, label: "Days played", color: "pink" },
    { value: totalXp, label: "Points Earned", color: "green" },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress – summary stats */}
        <ThemedText type="heading" style={styles.sectionTitle}>Progress</ThemedText>
        <View style={styles.progressGrid}>
          {summaryStats.map((stat, i) => (
            <StatCard
              key={i}
              value={stat.value}
              label={stat.label}
              color={stat.color}
            />
          ))}
        </View>

        {/* Progress – by category */}
        <ThemedText type="heading" style={styles.sectionTitle}>Progress</ThemedText>
        {categoryAnalytics.length === 0 ? (
          <View style={styles.activityCard}>
            <ThemedText style={styles.activityCategoryName}>
              No categories yet
            </ThemedText>
          </View>
        ) : (
          categoryAnalytics.slice(0, 6).map((cat) => (
            <View key={cat.category} style={styles.activityCard}>
              <View style={styles.activityCardLeft}>
                <View style={styles.activityIconWrap}>
                  <ThemedText style={styles.activityIconText}>
                    {cat.icon}
                  </ThemedText>
                </View>
                <ThemedText style={styles.activityCategoryName}>
                  {cat.label}
                </ThemedText>
              </View>
              <View style={styles.activityCountWrap}>
                <ThemedText style={styles.activityCountNum}>
                  {cat.totalActivities}
                </ThemedText>
                <ThemedText style={styles.activityCountLabel}>
                  Activities Completed
                </ThemedText>
              </View>
            </View>
          ))
        )}

        {/* Resources */}
        <ThemedText type="heading" style={[styles.sectionTitle, { marginTop: scaleH(24) }]}>
          Resources
        </ThemedText>
        <View style={styles.resourceCard}>
          <ThemedText type="heading" style={styles.resourceTitle}>Adventure Passes</ThemedText>
          <ThemedText style={styles.resourceDesc}>
            A printable adventurer pass for each of your explorers
          </ThemedText>
          <Pressable style={styles.resourceButton}>
            <ThemedText type="heading" style={styles.resourceButtonText}>
              Download & Print
            </ThemedText>
            <MaterialIcons name="print" size={scaleW(18)} color={COLORS.charcoal} />
          </Pressable>
        </View>
        <View style={styles.resourceCard}>
          <ThemedText type="heading" style={styles.resourceTitle}>Team Poster</ThemedText>
          <ThemedText style={styles.resourceDesc}>
            A poster featuring your team mascot.
          </ThemedText>
          <Pressable style={styles.resourceButton}>
            <ThemedText type="heading" style={styles.resourceButtonText}>
              Download & Print
            </ThemedText>
            <MaterialIcons name="print" size={scaleW(18)} color={COLORS.charcoal} />
          </Pressable>
        </View>

        {/* Settings */}
        <ThemedText type="heading" style={[styles.sectionTitle, { marginTop: scaleH(24) }]}>
          Settings
        </ThemedText>
        <ThemedText style={styles.sectionDesc}>
          Access settings to control your account and preferences.
        </ThemedText>
        <Pressable style={styles.settingsButton}>
          <ThemedText type="heading" style={styles.settingsButtonText}>Settings</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
