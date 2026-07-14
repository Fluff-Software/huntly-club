import React, { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import {
  View,
  ScrollView,
  Image,
  ImageBackground,
  Animated,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  type NativeSyntheticEvent,
  type NativeScrollEvent } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedReanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { CampfireTile } from "@/components/CampfireTile";
import { CaptainQuoteCard } from "@/components/CaptainQuoteCard";
import { TeamRaceCard } from "@/components/clubhouse/TeamRaceCard";
import { ThingsToDoRow } from "@/components/clubhouse/ThingsToDoRow";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useTutorialActive } from "@/hooks/useTutorialActive";
import { useRefreshWhenTutorialEnds } from "@/hooks/useRefreshWhenTutorialEnds";
import {
  useSessionsWithMissions,
  type SessionWithActivities,
} from "@/hooks/useSessionsWithMissions";
import { usePlayer } from "@/contexts/PlayerContext";
import { useProfileDashboard } from "@/contexts/ProfileDashboardContext";
import { useUser } from "@/contexts/UserContext";
import { useHomeBootstrap } from "@/contexts/HomeBootstrapContext";
import {
  getRandomClubPhotos,
  type ClubPhotoCardItem,
  type EarliestAvailableMission,
} from "@/services/activityProgressService";
import { getTeamCardConfig } from "@/utils/teamUtils";
import {
  prefetchClubPhotoImages,
  prefetchTeamCardAssets,
} from "@/utils/homeActivityPreload";
import type { ImageSourcePropType } from "react-native";

const CREAM = "#FFF8DC";
const HUNTLY_GREEN = "#4F6F52";
const DEFAULT_HEADER_GRADIENT = ["#4F6F52", "#7FB069"] as const;
const DEFAULT_MISSION_IMAGE = require("@/assets/images/laser-fortress.jpg");

const CLUB_CARDS_PAGE_SIZE = 6;
const CLUB_CARDS_MAX = 24;

/** Pastel/bright author badge colors (white text) for club cards */
const CLUB_CARD_AUTHOR_COLORS = [
  "#D4A05A", // warm amber
  "#8B7BA8", // soft violet
  "#7A9B76", // sage green
  "#5B8A9E", // slate blue
  "#C97B6C", // dusty coral
];

function missionImageToUrl(image: ImageSourcePropType): string | null {
  if (typeof image === "object" && image != null && "uri" in image && typeof image.uri === "string") {
    return image.uri;
  }
  return null;
}

/** Next uncompleted mission across sessions (oldest session first, then mission order); falls back to the last mission once everything is complete. */
function pickNextMission(
  sessions: SessionWithActivities[],
  completedActivityIds: Set<string>
): EarliestAvailableMission | null {
  if (sessions.length === 0) return null;

  for (let sessionIndex = sessions.length - 1; sessionIndex >= 0; sessionIndex -= 1) {
    for (const card of sessions[sessionIndex].activities) {
      if (!completedActivityIds.has(card.id)) {
        return {
          id: parseInt(card.id, 10),
          title: card.title,
          description: card.description || null,
          image: missionImageToUrl(card.image),
          xp: card.xp,
        };
      }
    }
  }

  const fallback = sessions[sessions.length - 1]?.activities[0];
  if (!fallback) return null;
  return {
    id: parseInt(fallback.id, 10),
    title: fallback.title,
    description: fallback.description || null,
    image: missionImageToUrl(fallback.image),
    xp: fallback.xp,
  };
}

export default function HomeScreen() {
  const { scaleW, width } = useLayoutScale();
  const { clubhouseActivityReady, requireClubhouseActivityReady, markClubhouseActivityReady } =
    useHomeBootstrap();
  const { profiles, loading: profilesLoading } = usePlayer();
  const { preload: preloadProfileDashboard } = useProfileDashboard();
  const { team } = useUser();
  const firstProfileId = profiles[0]?.id ?? null;
  const allProfileIds = useMemo(() => profiles.map((profile) => profile.id), [profiles]);
  const {
    sessions,
    completedActivityIds,
    loading: sessionsLoading,
    refetch: refetchSessions,
  } = useSessionsWithMissions(firstProfileId, { allProfileIds });
  const nextMission = useMemo(
    () => pickNextMission(sessions, completedActivityIds),
    [sessions, completedActivityIds]
  );
  const [clubCards, setClubCards] = useState<ClubPhotoCardItem[]>([]);
  const [clubCardsLoading, setClubCardsLoading] = useState(true);
  const [loadingMoreClubCards, setLoadingMoreClubCards] = useState(false);
  const loadingMoreClubCardsRef = useRef(false);
  const [clubMediaReady, setClubMediaReady] = useState(false);
  const [teamAssetsReady, setTeamAssetsReady] = useState(false);
  const [campfireTileReady, setCampfireTileReady] = useState(false);
  const hasRevealedActivityTilesRef = useRef(false);
  const isTutorialActive = useTutorialActive();
  const teamCardConfig = team ? getTeamCardConfig(team.name) : null;

  useEffect(() => {
    if (!profilesLoading && profiles.length > 0) {
      preloadProfileDashboard();
    }
  }, [profilesLoading, profiles.length, preloadProfileDashboard]);

  useEffect(() => {
    let cancelled = false;
    setClubCardsLoading(true);
    setClubMediaReady(false);
    getRandomClubPhotos(CLUB_CARDS_PAGE_SIZE).then((cards) => {
      if (!cancelled) setClubCards(cards);
    }).catch(() => {
      if (!cancelled) setClubCards([]);
    }).finally(() => {
      if (!cancelled) setClubCardsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const initialClubCardSignature = useMemo(
    () => clubCards.slice(0, CLUB_CARDS_PAGE_SIZE).map((card) => card.id).join(","),
    [clubCards]
  );

  useEffect(() => {
    if (clubCardsLoading) {
      setClubMediaReady(false);
      return;
    }
    if (clubCards.length === 0) {
      setClubMediaReady(true);
      return;
    }
    let cancelled = false;
    setClubMediaReady(false);
    void prefetchClubPhotoImages(clubCards.slice(0, CLUB_CARDS_PAGE_SIZE))
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setClubMediaReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clubCardsLoading, initialClubCardSignature]);

  useEffect(() => {
    if (!teamCardConfig) {
      setTeamAssetsReady(true);
      return;
    }
    let cancelled = false;
    setTeamAssetsReady(false);
    void prefetchTeamCardAssets(teamCardConfig)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setTeamAssetsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [teamCardConfig]);

  const loadMoreClubCards = async () => {
    if (loadingMoreClubCardsRef.current || clubCards.length === 0 || clubCards.length >= CLUB_CARDS_MAX) return;
    loadingMoreClubCardsRef.current = true;
    setLoadingMoreClubCards(true);
    try {
      const excludeIds = clubCards.map((c) => c.id);
      const remaining = CLUB_CARDS_MAX - clubCards.length;
      const pageSize = Math.min(CLUB_CARDS_PAGE_SIZE, remaining);
      const more = await getRandomClubPhotos(pageSize, excludeIds);
      if (more.length > 0) {
        const existingIds = new Set(clubCards.map((c) => c.id));
        const newCards = more.filter((c) => !existingIds.has(c.id));
        setClubCards((prev) => prev.concat(newCards));
      }
    } catch {
      // ignore; we already have cards
    } finally {
      setLoadingMoreClubCards(false);
      loadingMoreClubCardsRef.current = false;
    }
  };

  const scrollRef = useRef<ScrollView>(null);
  const clubCardsScrollX = useRef(new Animated.Value(0)).current;
  const cardWidth = scaleW(250);
  const cardGap = scaleW(12);
  const clubCardStep = cardWidth + cardGap;
  const clubViewportWidth = width - scaleW(48);
  const clubCardsPaddingHorizontal = Math.max(0, Math.round((clubViewportWidth - cardWidth) / 2));
  const getCenterScrollX = (index: number) => index * clubCardStep;

  const missionTileReady = !sessionsLoading;
  const showClubTile = clubCards.length > 0;
  const clubTileReady = !clubCardsLoading && (!showClubTile || clubMediaReady);
  const teamTileReady = !teamCardConfig || teamAssetsReady;
  const activityTilesReady =
    missionTileReady &&
    campfireTileReady &&
    clubTileReady &&
    teamTileReady;

  const handleCampfireReadyChange = useCallback((ready: boolean) => {
    setCampfireTileReady(ready);
  }, []);

  useLayoutEffect(() => {
    requireClubhouseActivityReady();
  }, [requireClubhouseActivityReady]);

  useEffect(() => {
    if (activityTilesReady) {
      markClubhouseActivityReady();
    }
  }, [activityTilesReady, markClubhouseActivityReady]);

  const activityTilesOpacity = useSharedValue(0);
  const activityTilesTranslateY = useSharedValue(30);
  const activityTilesGroupStyle = useAnimatedStyle(() => ({
    opacity: activityTilesOpacity.value,
    transform: [{ translateY: activityTilesTranslateY.value }],
  }));

  useEffect(() => {
    if (!activityTilesReady) {
      if (!hasRevealedActivityTilesRef.current) {
        activityTilesOpacity.value = 0;
        activityTilesTranslateY.value = 30;
      }
      return;
    }
    hasRevealedActivityTilesRef.current = true;
    activityTilesOpacity.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    activityTilesTranslateY.value = withSpring(0, { damping: 28, stiffness: 220 });
  }, [activityTilesReady, activityTilesOpacity, activityTilesTranslateY]);

  const refreshHomeData = useCallback(() => {
    void refetchSessions();
  }, [refetchSessions]);

  useFocusEffect(
    useCallback(() => {
      if (!isTutorialActive) {
        refreshHomeData();
      }
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [isTutorialActive, refreshHomeData])
  );

  useRefreshWhenTutorialEnds(refreshHomeData);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        contentContainer: { paddingBottom: scaleW(40) },
        horizontalCardsContainer: {
          paddingLeft: clubCardsPaddingHorizontal,
          paddingRight: clubCardsPaddingHorizontal,
          paddingBottom: scaleW(8) },
        clubCard: { width: scaleW(250), marginRight: scaleW(12) },
        clubCardImageWrap: {
          width: scaleW(250),
          height: scaleW(250),
          borderRadius: scaleW(16),
          overflow: "hidden" as const,
          backgroundColor: "#E0E0E0",
          borderWidth: 2,
          borderColor: "#FFF",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2 },
        clubCardImage: { width: "100%", height: "100%" },
      }),
    [scaleW, clubCardsPaddingHorizontal]
  );

  const eyebrowText = teamCardConfig ? `${teamCardConfig.title.toUpperCase()} DEN` : "THE DEN";

  return (
    <View style={{ flex: 1, backgroundColor: CREAM }}>
      {!clubhouseActivityReady ? (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: CREAM,
          }}
          pointerEvents="none"
        >
          <ActivityIndicator size="large" color={HUNTLY_GREEN} />
        </View>
      ) : null}
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={[{ flex: 1 }, !clubhouseActivityReady && { opacity: 0 }]}
        pointerEvents={clubhouseActivityReady ? "auto" : "none"}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={styles.contentContainer}
        >
          {/* Header */}
          <LinearGradient
            colors={
              teamCardConfig
                ? ([teamCardConfig.accentColor, teamCardConfig.backgroundColor] as const)
                : DEFAULT_HEADER_GRADIENT
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingHorizontal: scaleW(24),
              paddingTop: scaleW(20),
              paddingBottom: scaleW(48),
              gap: scaleW(10),
              overflow: "hidden",
              position: "relative",
            }}
          >
            {teamCardConfig && (
              <Image
                source={teamCardConfig.standingImage}
                resizeMode="contain"
                style={{
                  position: "absolute",
                  right: scaleW(-14),
                  bottom: scaleW(-16),
                  width: scaleW(130),
                  height: scaleW(160),
                  opacity: 0.9,
                }}
              />
            )}
            <View style={{ gap: scaleW(4), maxWidth: "72%" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: scaleW(6) }}>
                {teamCardConfig && (
                  <Image
                    source={teamCardConfig.badgeImage}
                    resizeMode="contain"
                    style={{ width: scaleW(18), height: scaleW(18) }}
                  />
                )}
                <ThemedText lightColor="rgba(255,255,255,0.85)" darkColor="rgba(255,255,255,0.85)" style={{ fontSize: scaleW(13), fontWeight: "800", letterSpacing: 1 }}>
                  {eyebrowText}
                </ThemedText>
              </View>
              <ThemedText
                type="heading"
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                style={{ fontSize: scaleW(28), fontWeight: "800", lineHeight: scaleW(32) }}
              >
                Welcome back, Explorer!
              </ThemedText>
            </View>
          </LinearGradient>

          <View style={{ position: "relative", marginTop: -scaleW(32), paddingHorizontal: scaleW(24) }}>
            <AnimatedReanimated.View
              style={[
                { gap: scaleW(16) },
                activityTilesGroupStyle,
                !activityTilesReady && {
                  position: "absolute",
                  top: 0,
                  left: scaleW(24),
                  right: scaleW(24),
                  opacity: 0,
                },
              ]}
              pointerEvents={activityTilesReady ? "auto" : "none"}
            >
              <TeamRaceCard userTeamName={team?.name} />

              {sessionsLoading ? (
                <View style={{ paddingVertical: scaleW(24), alignItems: "center" }}>
                  <ActivityIndicator size="large" color={HUNTLY_GREEN} />
                </View>
              ) : nextMission ? (
                <View
                  style={{
                    borderRadius: scaleW(22),
                    borderWidth: 3,
                    borderColor: "#FFF",
                    overflow: "hidden",
                    transform: [{ rotate: "-0.6deg" }],
                    shadowColor: "#000",
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 4,
                  }}
                >
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/activity/mission",
                      params: { id: String(nextMission.id) },
                    } as Parameters<typeof router.push>[0])
                  }
                  style={({ pressed }) => pressed ? { opacity: 0.9 } : undefined}
                >
                  <ImageBackground
                    source={
                      nextMission.image
                        ? { uri: nextMission.image }
                        : DEFAULT_MISSION_IMAGE
                    }
                    resizeMode="cover"
                    imageStyle={{ borderRadius: scaleW(19) }}
                    style={{ minHeight: scaleW(230), justifyContent: "space-between", borderRadius: scaleW(19) }}
                  >
                    <View style={{ padding: scaleW(16) }}>
                      <View
                        style={{
                          alignSelf: "flex-start",
                          backgroundColor: "#E07B20",
                          borderRadius: scaleW(14),
                          paddingHorizontal: scaleW(12),
                          paddingVertical: scaleW(6),
                        }}
                      >
                        <ThemedText style={{ color: "#FFF", fontSize: scaleW(11), fontWeight: "800", letterSpacing: 0.5 }}>
                          NEXT MISSION
                        </ThemedText>
                      </View>
                    </View>
                    <LinearGradient
                      colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.75)"]}
                      style={{ paddingHorizontal: scaleW(18), paddingTop: scaleW(40), paddingBottom: scaleW(20), gap: scaleW(4) }}
                    >
                      <ThemedText type="heading" lightColor="#FFF" darkColor="#FFF" style={{ fontSize: scaleW(22), fontWeight: "800" }}>
                        {nextMission.title}
                      </ThemedText>
                      {nextMission.xp != null && (
                        <ThemedText lightColor="rgba(255,255,255,0.9)" darkColor="rgba(255,255,255,0.9)" style={{ fontSize: scaleW(14), fontWeight: "700" }}>
                          +{nextMission.xp} team pts
                        </ThemedText>
                      )}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          alignSelf: "flex-start",
                          backgroundColor: "#FFF",
                          borderRadius: scaleW(24),
                          paddingVertical: scaleW(10),
                          paddingHorizontal: scaleW(20),
                          marginTop: scaleW(10),
                          gap: scaleW(4),
                        }}
                      >
                        <ThemedText style={{ color: HUNTLY_GREEN, fontWeight: "800", fontSize: scaleW(15) }}>
                          Start mission
                        </ThemedText>
                        <MaterialIcons name="chevron-right" size={scaleW(16)} color={HUNTLY_GREEN} />
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                </Pressable>
                </View>
              ) : null}

              <ThingsToDoRow />

              {teamCardConfig && <CaptainQuoteCard teamName={team?.name} />}

              <CampfireTile
                coordinatedEntrance
                onReadyChange={handleCampfireReadyChange}
              />

              {showClubTile && (
                <View
                  style={{
                    backgroundColor: "#BBE5EB",
                    borderRadius: scaleW(16),
                    paddingTop: scaleW(16),
                    paddingBottom: scaleW(20),
                    borderWidth: 3,
                    borderColor: "#FFF",
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                    overflow: Platform.OS === "android" ? "visible" : undefined }}
                  collapsable={Platform.OS !== "android"}
                >
                  <ThemedText type="heading" style={{ color: "#1A5C6B", fontSize: scaleW(18), fontWeight: "700", marginBottom: scaleW(14), textAlign: "center" }}>
                    From around the club
                  </ThemedText>
                  <Animated.ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalCardsContainer}
                    style={{ overflow: "visible" }}
                    nestedScrollEnabled={Platform.OS === "android"}
                    removeClippedSubviews={false}
                    overScrollMode="never"
                    scrollEventThrottle={16}
                    onScroll={Animated.event(
                      [{ nativeEvent: { contentOffset: { x: clubCardsScrollX } } }],
                      { useNativeDriver: true, listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
                        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                        const nearEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - scaleW(150);
                        if (nearEnd) loadMoreClubCards();
                      } }
                    )}
                    snapToInterval={clubCardStep}
                    snapToAlignment="start"
                    decelerationRate="fast"
                  >
                    {clubCards.map((card, index) => {
                      const centerScrollX = index === 0 ? 0 : getCenterScrollX(index);
                      const rotation = clubCardsScrollX.interpolate({
                        inputRange: [
                          centerScrollX - 120,
                          centerScrollX,
                          centerScrollX + 120,
                        ],
                        outputRange: ["-4deg", "0deg", "4deg"],
                        extrapolate: "clamp" });
                      return (
                        <Animated.View
                          key={card.id}
                          style={[styles.clubCard, { transform: [{ rotate: rotation }] }]}
                        >
                          <Pressable style={{ flex: 1 }}>
                            <View style={styles.clubCardImageWrap}>
                              <ExpoImage
                                source={{ uri: card.thumb_url || card.photo_url }}
                                style={styles.clubCardImage}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                              />
                              {card.team_name && (() => {
                                const cfg = getTeamCardConfig(card.team_name);
                                return (
                                  <Image
                                    source={cfg.badgeImage}
                                    resizeMode="contain"
                                    style={{
                                      position: "absolute",
                                      bottom: scaleW(8),
                                      right: scaleW(8),
                                      width: scaleW(36),
                                      height: scaleW(36) }}
                                  />
                                );
                              })()}
                              <ThemedText type="heading" style={{
                                position: "absolute",
                                bottom: scaleW(40),
                                left: scaleW(10),
                                fontSize: scaleW(18),
                                textAlign: "center",
                                fontWeight: "600",
                                backgroundColor: "#FFF",
                                borderRadius: scaleW(20),
                                paddingHorizontal: scaleW(5) }}>
                                {card.title}
                              </ThemedText>
                              <ThemedText type="heading" style={{
                                position: "absolute",
                                bottom: scaleW(10),
                                left: scaleW(10),
                                fontSize: scaleW(16),
                                textAlign: "center",
                                fontWeight: "600",
                                backgroundColor: CLUB_CARD_AUTHOR_COLORS[index % CLUB_CARD_AUTHOR_COLORS.length],
                                color: "#FFF",
                                borderRadius: scaleW(20),
                                paddingHorizontal: scaleW(5) }}>
                                by {card.author}
                              </ThemedText>
                            </View>
                          </Pressable>
                        </Animated.View>
                      );
                    })}
                    {loadingMoreClubCards && (
                      <View style={[styles.clubCard, { justifyContent: "center", alignItems: "center", minWidth: scaleW(100) }]}>
                        <ActivityIndicator size="small" color="#5B8A9E" />
                      </View>
                    )}
                  </Animated.ScrollView>
                </View>
              )}
            </AnimatedReanimated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
