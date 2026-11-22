import React, { useState, useEffect } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { FKButton, FKCard, FKEyebrow, FKLoading, FKPageHeader } from "@/components/fieldkit";
import { ParentPinModal } from "@/components/ParentPinModal";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/services/supabase";
import { getCategories } from "@/services/categoriesService";
import { familySentence } from "@/utils/familyNames";

interface CategoryAnalytics {
  categoryId: number;
  label: string;
  icon: string | null;
  totalActivities: number;
  totalXp: number;
  explorerCount: number;
}

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.navigate("/(tabs)/me");
};

/** Grown-up guides: a plain view of how the family is getting on, plus the printable guides. */
export default function ParentsScreen() {
  const { user } = useAuth();
  const { daysPlayed, pointsEarned } = useUser();
  const { profiles: players } = usePlayer();
  const [hasExplorers, setHasExplorers] = useState(false);
  const [categoryAnalytics, setCategoryAnalytics] = useState<CategoryAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalActivities, setTotalActivities] = useState(0);
  const [missionsByProfile, setMissionsByProfile] = useState<Record<number, number>>({});
  const [showAllProgress, setShowAllProgress] = useState(false);
  // Parent Zone math-gate temporarily disabled – keep state commented for easy restore
  // const [showPinModal, setShowPinModal] = useState(true);
  // const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    if (isAuthenticated) {
      fetchExplorersData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAuthenticated]);

  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle("dark");
      // Parent PIN check disabled for now
      // setShowPinModal(true);
      // setIsAuthenticated(false);
    }, [])
  );

  const fetchExplorersData = async () => {
    try {
      setLoading(true);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user!.id);

      if (profilesError) throw profilesError;

      const categoriesList = await getCategories();
      let totalActivitiesSum = 0;
      const perProfile: Record<number, number> = {};
      const categoryStatsMap: {
        [categoryId: number]: {
          count: number;
          xp: number;
          explorers: Set<number>;
        };
      } = {};

      for (const profile of profiles || []) {
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
          .not("completed_at", "is", null);

        if (activitiesError) {
          console.error("Error fetching activities:", activitiesError);
          continue;
        }

        const completedActivities = activities ?? [];
        totalActivitiesSum += completedActivities.length;
        perProfile[profile.id] = completedActivities.length;

        completedActivities.forEach((activity) => {
          const activityData = Array.isArray(activity.activities) ? activity.activities[0] : activity.activities;
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
          });
        });
      }

      const analytics: CategoryAnalytics[] = categoriesList
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

      setHasExplorers((profiles?.length ?? 0) > 0);
      setCategoryAnalytics(analytics);
      setTotalActivities(totalActivitiesSum);
      setMissionsByProfile(perProfile);
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
    goBack();
  };

  if (showPinModal) {
    return (
      <View style={styles.root}>
        <FKLoading />
        <ParentPinModal visible={showPinModal} onSuccess={handlePinSuccess} onCancel={handlePinCancel} />
      </View>
    );
  }

  if (loading && isAuthenticated && user) {
    return (
      <View style={styles.root}>
        <FKLoading />
      </View>
    );
  }

  const names = players.map((p) => p.name || p.nickname);
  const who = familySentence(names, "your explorers");
  const visibleCategories = showAllProgress ? categoryAnalytics : categoryAnalytics.slice(0, 4);
  const maxCategory = categoryAnalytics[0]?.totalActivities ?? 1;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FKPageHeader eyebrow="For grown-ups" title="Grown-up guides" onBack={goBack} />

        {!user ? (
          <FKCard>
            <Text style={TYPE.heading}>Sign in to see this</Text>
            <Text style={[TYPE.body, { marginTop: 6 }]}>This page shows your family&apos;s progress once you&apos;re signed in.</Text>
          </FKCard>
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(400)}>
              <View style={styles.guides}>
                <View style={styles.guidesIcon}>
                  <Ionicons name="book-outline" size={24} color={FK.skyInk} />
                </View>
                <Text style={[TYPE.heading, { color: FK.skyInk, marginTop: 12 }]}>Guides and downloads</Text>
                <Text style={[TYPE.body, { color: FK.skyInk, marginTop: 4, marginBottom: 16 }]}>
                  Printable sheets and short guides to help you plan time outside.
                </Text>
                <FKButton label="Open guides" onPress={() => router.push("/(tabs)/resources")} />
              </View>
            </Animated.View>

            {!hasExplorers ? (
              <FKCard style={{ marginTop: 16 }}>
                <Text style={TYPE.heading}>No explorers yet</Text>
                <Text style={[TYPE.body, { marginTop: 6, marginBottom: 14 }]}>
                  Add an explorer and their progress will show up here.
                </Text>
                <FKButton label="Add an explorer" variant="ink" onPress={() => router.push("/(tabs)/profile")} />
              </FKCard>
            ) : (
              <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                <FKEyebrow style={styles.section}>Progress so far</FKEyebrow>
                <View style={styles.stats}>
                  <Stat value={totalActivities} label={totalActivities === 1 ? "Mission done" : "Missions done"} />
                  <Stat value={categoryAnalytics.length} label="Skill areas tried" />
                  <Stat value={daysPlayed} label="Days since you joined" />
                  <Stat value={pointsEarned} label="Points earned" />
                </View>

                {players.length > 1 ? (
                  <>
                    <FKEyebrow style={styles.section}>Each explorer</FKEyebrow>
                    <FKCard style={{ paddingVertical: 6 }}>
                      {players.map((p, i) => {
                        const count = missionsByProfile[p.id] ?? 0;
                        return (
                          <View key={p.id} style={i > 0 ? [styles.explorerRow, styles.divider] : styles.explorerRow}>
                            <Text style={styles.explorerName}>{p.name || p.nickname || "Explorer"}</Text>
                            <Text style={styles.explorerCount}>
                              {count} {count === 1 ? "mission" : "missions"}
                            </Text>
                          </View>
                        );
                      })}
                    </FKCard>
                  </>
                ) : null}

                <FKEyebrow style={styles.section}>What {who} {players.length === 1 ? "has" : "have"} practised</FKEyebrow>
                {categoryAnalytics.length === 0 ? (
                  <FKCard>
                    <Text style={TYPE.body}>Finished missions will show the skills they cover here.</Text>
                  </FKCard>
                ) : (
                  <FKCard style={{ paddingVertical: 8 }}>
                    {visibleCategories.map((cat, i) => (
                      <View key={cat.categoryId} style={i > 0 ? [styles.catRow, styles.divider] : styles.catRow}>
                        <View style={styles.catIcon}>
                          {cat.icon ? (
                            <Image source={{ uri: cat.icon }} style={{ width: 22, height: 22, borderRadius: 2 }} resizeMode="cover" />
                          ) : (
                            <Ionicons name="pricetag-outline" size={20} color={FK.ink} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.catTop}>
                            <Text style={styles.catName} numberOfLines={1}>
                              {cat.label}
                            </Text>
                            <Text style={styles.catCount}>{cat.totalActivities}</Text>
                          </View>
                          <View style={styles.track}>
                            <View
                              style={[styles.fill, { width: `${Math.max(6, Math.round((cat.totalActivities / maxCategory) * 100))}%` }]}
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                  </FKCard>
                )}
                {categoryAnalytics.length > 4 ? (
                  <FKButton
                    label={showAllProgress ? "Show fewer" : `Show all ${categoryAnalytics.length}`}
                    variant="link"
                    onPress={() => setShowAllProgress((prev) => !prev)}
                  />
                ) : null}
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FK.moss },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, width: "100%", maxWidth: 720, alignSelf: "center" },
  section: { marginTop: 22, marginBottom: 10 },
  guides: { backgroundColor: FK.sky, borderRadius: RADIUS.lg, padding: 18 },
  guidesIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: FK.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { flexGrow: 1, flexBasis: "45%", backgroundColor: FK.paper, borderRadius: RADIUS.md, padding: 14 },
  statValue: { fontFamily: FONT.display, fontSize: 30, color: FK.ink },
  statLabel: { fontFamily: FONT.displayBold, fontSize: 14, color: FK.muted },
  explorerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: FK.line },
  explorerName: { fontFamily: FONT.display, fontSize: 17, color: FK.ink },
  explorerCount: { fontFamily: FONT.bodyBold, fontSize: 15, color: FK.muted },
  catRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FK.moss,
    alignItems: "center",
    justifyContent: "center",
  },
  catTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  catName: { flex: 1, fontFamily: FONT.displayBold, fontSize: 16, color: FK.ink },
  catCount: { fontFamily: FONT.display, fontSize: 16, color: FK.ink },
  track: { height: 6, borderRadius: 3, backgroundColor: FK.line, overflow: "hidden", marginTop: 6 },
  fill: { height: 6, borderRadius: 3, backgroundColor: FK.forest },
});
