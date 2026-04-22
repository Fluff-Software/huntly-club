import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
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
  type NativeScrollEvent,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import AnimatedReanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeOutDown,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { MissionCard } from "@/components/MissionCard";
import { StatCard } from "@/components/StatCard";
import { AddJournalEntryModal } from "@/components/AddJournalEntryModal";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useCurrentChapterActivities } from "@/hooks/useCurrentChapterActivities";
import { useUser } from "@/contexts/UserContext";
import { getRandomClubPhotos, type ClubPhotoCardItem } from "@/services/activityProgressService";
import { getTeamCardConfig } from "@/utils/teamUtils";
import type { ActivityTag } from "@/services/journalService";

type HomeMode = "profile" | "activity" | "missions";
const HOME_MODES: HomeMode[] = ["profile", "activity", "missions"];

const BG_IMAGE = require("@/assets/images/bg.png");

const CREAM = "#F4F0EB";
const HUNTLY_GREEN = "#4F6F52";

const CLUB_CARDS_PAGE_SIZE = 6;
const CLUB_CARDS_MAX = 24;

/** Must match team card slide `withTiming` duration */
const TEAM_CARD_SLIDE_DURATION_MS = 420;
/** Pause after team card motion finishes, then club section fades in */
const CLUB_SECTION_PAUSE_AFTER_TEAM_MS = 500;
/** Wait after team image loads before sliding in (avoids image pop-in) */
const TEAM_CARD_WAIT_AFTER_RENDER_MS = 500;

/** Pastel/bright author badge colors (white text) for club cards */
const CLUB_CARD_AUTHOR_COLORS = [
  "#D4A05A", // warm amber
  "#8B7BA8", // soft violet
  "#7A9B76", // sage green
  "#5B8A9E", // slate blue
  "#C97B6C", // dusty coral
];

const TEAM_CARD_MESSAGES = [
  "We're doing great helping test the wind clues this week!",
  "We're making progress on the challenges this week!",
  "We're doing well with the nature clues and teamwork!",
  "We're having fun exploring and solving puzzles together!",
  "We're doing great with the outdoor missions!",
];

export default function HomeScreen() {
  const { scaleW, width, height } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const { team, teamId, daysPlayed, pointsEarned } = useUser();
  const {
    latestMission,
    latestUnfinishedMission,
    loading: missionLoading,
    refetch: refetchMissions,
  } = useCurrentChapterActivities(null);
  const [clubCards, setClubCards] = useState<ClubPhotoCardItem[]>([]);
  const [clubCardsLoading, setClubCardsLoading] = useState(true);
  const [loadingMoreClubCards, setLoadingMoreClubCards] = useState(false);
  const [clubImageStatus, setClubImageStatus] = useState<Record<string, "loading" | "loaded" | "error">>({});
  const [showClubSection, setShowClubSection] = useState(false);
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [initialActivityTag, setInitialActivityTag] = useState<ActivityTag>("Walk");
  const initialIndex = 1; // activity (Welcome back)
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const currentMode = HOME_MODES[currentIndex] ?? "activity";
  const teamCardMessage = useMemo(() => TEAM_CARD_MESSAGES[Math.floor(Math.random() * TEAM_CARD_MESSAGES.length)], []);

  useEffect(() => {
    let cancelled = false;
    setClubCardsLoading(true);
    getRandomClubPhotos(CLUB_CARDS_PAGE_SIZE).then((cards) => {
      if (!cancelled) setClubCards(cards);
    }).catch(() => {
      if (!cancelled) setClubCards([]);
    }).finally(() => {
      if (!cancelled) setClubCardsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const loadMoreClubCards = async () => {
    if (loadingMoreClubCards || clubCards.length === 0 || clubCards.length >= CLUB_CARDS_MAX) return;
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
    }
  };

  const teamCardConfig = team ? getTeamCardConfig(team.name) : null;

  const pagerRef = useRef<ScrollView>(null);
  const pagerX = useRef(new Animated.Value(width * initialIndex)).current;
  const backgroundTranslateX = Animated.multiply(pagerX, -1);

  const clubCardsScrollX = useRef(new Animated.Value(0)).current;
  const cardWidth = scaleW(250);
  const cardBorderWidth = 2;
  const cardGap = scaleW(12);
  const clubCardStep = cardWidth + cardGap;
  const clubViewportWidth = width - scaleW(48);
  const clubCardsPaddingHorizontal = Math.max(0, Math.round((clubViewportWidth - cardWidth) / 2));
  const getCenterScrollX = (index: number) => index * clubCardStep;

  const missionCardWidth = scaleW(270);
  const missionViewportWidth = width - scaleW(48);
  const missionCardsPaddingHorizontal = Math.max(0, Math.round((missionViewportWidth - missionCardWidth) / 2));

  const springLessBouncy = { damping: 15, stiffness: 120 };
  const buttonSpring = { damping: 15, stiffness: 400 };
  const profileButtonScale = useSharedValue(1);
  const missionsButtonScale = useSharedValue(1);
  const navScale = useSharedValue(1);
  const [showTeamCard, setShowTeamCard] = useState(false);
  const [teamCardImageReady, setTeamCardImageReady] = useState(false);
  const [teamSlideHasStarted, setTeamSlideHasStarted] = useState(false);
  const teamSlideStartedAtRef = useRef<number | null>(null);
  const clubScheduleRetryRef = useRef(0);
  const teamCardTranslateX = useSharedValue(240);
  const teamCardOpacity = useSharedValue(0);
  const fabRotation = useSharedValue(0);

  const profileButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: profileButtonScale.value }] }));
  const missionsButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: missionsButtonScale.value }] }));
  const navButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: navScale.value }] }));
  const teamCardStyle = useAnimatedStyle(() => ({
    opacity: teamCardOpacity.value,
    transform: [{ translateX: teamCardTranslateX.value }],
  }));
  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${fabRotation.value}deg` }],
  }));

  useEffect(() => {
    if (!teamCardConfig) {
      setShowTeamCard(false);
      setTeamCardImageReady(false);
      setTeamSlideHasStarted(false);
      teamSlideStartedAtRef.current = null;
      teamCardTranslateX.value = 240;
      teamCardOpacity.value = 0;
      return;
    }

    // Mount immediately, but don't slide in until image is ready.
    setShowTeamCard(true);
    setTeamCardImageReady(false);
    setTeamSlideHasStarted(false);
    teamCardTranslateX.value = 240;
    teamCardOpacity.value = 0;
  }, [teamCardConfig, teamCardOpacity, teamCardTranslateX]);

  useEffect(() => {
    if (!teamCardConfig || !showTeamCard || !teamCardImageReady) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setTeamSlideHasStarted(true);
      teamSlideStartedAtRef.current = Date.now();
      teamCardTranslateX.value = 240;
      teamCardOpacity.value = 0;
      teamCardTranslateX.value = withTiming(0, {
        duration: TEAM_CARD_SLIDE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
      teamCardOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    }, TEAM_CARD_WAIT_AFTER_RENDER_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    teamCardConfig,
    showTeamCard,
    teamCardImageReady,
    setTeamSlideHasStarted,
    teamCardOpacity,
    teamCardTranslateX,
  ]);

  // "From around the club": data must be loaded, then after team slide finishes + 0.5s (or 0.5s if no team card)
  useEffect(() => {
    setShowClubSection(false);
    clubScheduleRetryRef.current = 0;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const clubDataReady = !clubCardsLoading && clubCards.length > 0;
    if (!clubDataReady) {
      return () => {
        cancelled = true;
      };
    }

    const scheduleShow = () => {
      if (cancelled) return;

      if (!teamCardConfig) {
        timers.push(
          setTimeout(() => {
            if (!cancelled) setShowClubSection(true);
          }, CLUB_SECTION_PAUSE_AFTER_TEAM_MS)
        );
        return;
      }

      const slideStart = teamSlideStartedAtRef.current;
      if (slideStart == null) {
        clubScheduleRetryRef.current += 1;
        if (clubScheduleRetryRef.current > 40) {
          const fallbackDelay =
            TEAM_CARD_SLIDE_DURATION_MS + CLUB_SECTION_PAUSE_AFTER_TEAM_MS;
          timers.push(
            setTimeout(() => {
              if (!cancelled) setShowClubSection(true);
            }, fallbackDelay)
          );
          return;
        }
        timers.push(setTimeout(scheduleShow, 16));
        return;
      }

      const targetTime =
        slideStart +
        TEAM_CARD_SLIDE_DURATION_MS +
        CLUB_SECTION_PAUSE_AFTER_TEAM_MS;
      const delay = Math.max(0, targetTime - Date.now());
      timers.push(
        setTimeout(() => {
          if (!cancelled) setShowClubSection(true);
        }, delay)
      );
    };

    timers.push(setTimeout(scheduleShow, 0));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [clubCardsLoading, clubCards.length, teamCardConfig]);

  const shouldRenderClubSection = showClubSection && (!teamCardConfig || teamSlideHasStarted);

  const resetToActivityPage = useCallback(() => {
    if (width <= 0) return;
    pagerRef.current?.scrollTo({ x: width * initialIndex, animated: false });
    setCurrentIndex(initialIndex);
  }, [width, initialIndex]);

  useEffect(() => {
    const timer = setTimeout(() => {
      resetToActivityPage();
    }, 0);
    return () => clearTimeout(timer);
  }, [resetToActivityPage]);

  useFocusEffect(
    useCallback(() => {
      refetchMissions();
      resetToActivityPage();
    }, [refetchMissions, resetToActivityPage])
  );

  const pageAnimatedStyles = useMemo(() => {
    if (width <= 0) return [];
    const w = width;
    const inactiveOpacity = 0;
    const inactiveOffset = 36;
    const fadeEdge = w * 0.25;
    return [
      {
        opacity: pagerX.interpolate({
          inputRange: [0, fadeEdge, w],
          outputRange: [1, 0.6, inactiveOpacity],
          extrapolate: "clamp",
        }),
        transform: [
          {
            translateY: pagerX.interpolate({
              inputRange: [0, w],
              outputRange: [0, inactiveOffset],
              extrapolate: "clamp",
            }),
          },
        ],
      },
      {
        opacity: pagerX.interpolate({
          inputRange: [0, w - fadeEdge, w, w + fadeEdge, w * 2],
          outputRange: [inactiveOpacity, 0.6, 1, 0.6, inactiveOpacity],
          extrapolate: "clamp",
        }),
        transform: [
          {
            translateY: pagerX.interpolate({
              inputRange: [0, w, w * 2],
              outputRange: [inactiveOffset, 0, inactiveOffset],
              extrapolate: "clamp",
            }),
          },
        ],
      },
      {
        opacity: pagerX.interpolate({
          inputRange: [w, w * 2 - fadeEdge, w * 2],
          outputRange: [inactiveOpacity, 0.6, 1],
          extrapolate: "clamp",
        }),
        transform: [
          {
            translateY: pagerX.interpolate({
              inputRange: [w, w * 2],
              outputRange: [inactiveOffset, 0],
              extrapolate: "clamp",
            }),
          },
        ],
      },
    ] as const;
  }, [width, pagerX]);

  const switchMode = (mode: HomeMode) => {
    const nextIndex = HOME_MODES.indexOf(mode);
    if (nextIndex < 0) return;

    pagerRef.current?.scrollTo({ x: width * nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  };

  /**
   * First load only: once missions have loaded once for this team, keep CTA mounted.
   * Tab focus refetches set missionLoading true again — hiding the CTA would blink.
   */
  const [ctaMissionsReady, setCtaMissionsReady] = useState(false);
  useEffect(() => {
    setCtaMissionsReady(false);
  }, [teamId]);
  useEffect(() => {
    if (teamId != null && !missionLoading) {
      setCtaMissionsReady(true);
    }
  }, [teamId, missionLoading]);

  const showFab = teamId != null && ctaMissionsReady;

  // Keep CTA above the device bottom safe area.
  const bottomInset =
    Platform.OS === "android" && insets.bottom === 0 ? scaleW(24) : insets.bottom;
  const fabBottom = scaleW(24) + bottomInset;

  const openAddEntry = useCallback((tag: ActivityTag) => {
    setInitialActivityTag(tag);
    setShowQuickAddMenu(false);
    setShowAddEntryModal(true);
  }, []);

  const goToMission = useCallback(() => {
    const mission = latestUnfinishedMission ?? latestMission;
    if (!mission?.id) return;
    setShowQuickAddMenu(false);
    router.push({
      pathname: "/(tabs)/activity/mission",
      params: { id: mission.id },
    } as Parameters<typeof router.push>[0]);
  }, [latestUnfinishedMission, latestMission]);

  useEffect(() => {
    fabRotation.value = withTiming(showQuickAddMenu ? 45 : 0, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
    });
  }, [showQuickAddMenu, fabRotation]);

  useEffect(() => {
    if (!showFab) setShowQuickAddMenu(false);
  }, [showFab]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, overflow: "hidden" as const },
        backgroundContainer: {
          position: "absolute" as const,
          width: width * 3,
          height,
          left: 0,
          top: 0,
        },
        backgroundImage: { width: width * 3, height },
        backgroundOverlay: {
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.1)",
        },
        contentContainer: { paddingBottom: scaleW(40) },
        pager: { flex: 1 },
        pagerContent: { width: width * HOME_MODES.length },
        pagerPage: { width, flex: 1 },
        creamButton: {
          backgroundColor: CREAM,
          width: scaleW(220),
          alignSelf: "center",
          borderRadius: scaleW(50),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(24),
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        bearsCard: {
          borderRadius: scaleW(15),
          marginBottom: scaleW(20),
          paddingHorizontal: scaleW(14),
          paddingVertical: scaleW(12),
          minHeight: scaleW(180),
          width: "100%",
          overflow: "hidden" as const,
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        bearImage: {
          position: "absolute",
          width: scaleW(110),
          height: scaleW(110),
          right: 0,
          bottom: 0,
        },
        horizontalCardsContainer: {
          paddingLeft: clubCardsPaddingHorizontal,
          paddingRight: clubCardsPaddingHorizontal,
          paddingBottom: scaleW(8),
        },
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
          elevation: 2,
        },
        clubCardImage: { width: "100%", height: "100%" },
        clubCardPlaceholder: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: HUNTLY_GREEN,
          justifyContent: "center",
          alignItems: "center",
        },
        horizontalMissionCardsContainer: {
          paddingLeft: missionCardsPaddingHorizontal,
          paddingRight: missionCardsPaddingHorizontal,
          paddingBottom: scaleW(8),
        },
        fab: {
          position: "absolute",
          bottom: fabBottom,
          right: scaleW(24),
          width: scaleW(56),
          height: scaleW(56),
          borderRadius: scaleW(28),
          backgroundColor: CREAM,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: scaleW(3) },
          shadowOpacity: 0.2,
          shadowRadius: scaleW(6),
          elevation: 6,
        },
        menuOverlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "transparent",
        },
        quickAddMenu: {
          position: "absolute",
          right: scaleW(24),
          bottom: fabBottom + scaleW(56) + scaleW(12),
          width: scaleW(160),
          gap: scaleW(10),
        },
        quickAddButton: {
          backgroundColor: CREAM,
          borderRadius: scaleW(32),
          paddingVertical: scaleW(12),
          paddingHorizontal: scaleW(14),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: scaleW(2) },
          shadowOpacity: 0.16,
          shadowRadius: scaleW(4),
          elevation: 4,
        },
        quickAddButtonText: {
          fontSize: scaleW(15),
          fontWeight: "700",
          color: HUNTLY_GREEN,
          textAlign: "center",
        },
        ctaLayer: {
          ...StyleSheet.absoluteFillObject,
          zIndex: 30,
          elevation: 30,
          pointerEvents: "box-none" as const,
        },
      }),
    [
      scaleW,
      width,
      height,
      clubCardsPaddingHorizontal,
      missionCardsPaddingHorizontal,
      fabBottom,
    ]
  );

  const wrapNavPressable = (onPress: () => void, children: React.ReactNode) => (
    <AnimatedReanimated.View style={navButtonStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { navScale.value = withSpring(0.96, buttonSpring); }}
        onPressOut={() => { navScale.value = withSpring(1, buttonSpring); }}
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderRadius: scaleW(25),
          paddingHorizontal: scaleW(16),
          paddingVertical: scaleW(10),
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {children}
      </Pressable>
    </AnimatedReanimated.View>
  );

  const navArrowColor = "#4F6F52";
  const navArrowSize = scaleW(20);

  const renderNavigationButtons = () => {
    const navTextStyle = { fontSize: scaleW(14), color: "#4F6F52", fontWeight: "600" as const };

    if (currentMode === "profile") {
      return (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scaleW(24), paddingTop: scaleW(16) }}>
          <View style={{ width: scaleW(100) }} />
          {wrapNavPressable(() => switchMode("activity"), (
            <>
              <ThemedText type="body" style={navTextStyle}>
                Activity
              </ThemedText>
              <MaterialIcons name="chevron-right" size={navArrowSize} color={navArrowColor} style={{ marginLeft: scaleW(4) }} />
            </>
          ))}
        </View>
      );
    } else if (currentMode === "activity") {
      return (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scaleW(24), paddingTop: scaleW(16) }}>
          {wrapNavPressable(() => switchMode("profile"), (
            <>
              <MaterialIcons name="chevron-left" size={navArrowSize} color={navArrowColor} style={{ marginRight: scaleW(4) }} />
              <ThemedText type="body" style={navTextStyle}>
                Profile
              </ThemedText>
            </>
          ))}

          {wrapNavPressable(() => switchMode("missions"), (
            <>
              <ThemedText type="body" style={navTextStyle}>
                Missions
              </ThemedText>
              <MaterialIcons name="chevron-right" size={navArrowSize} color={navArrowColor} style={{ marginLeft: scaleW(4) }} />
            </>
          ))}
        </View>
      );
    } else {
      return (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scaleW(24), paddingTop: scaleW(16) }}>
          {wrapNavPressable(() => switchMode("activity"), (
            <>
              <MaterialIcons name="chevron-left" size={navArrowSize} color={navArrowColor} style={{ marginRight: scaleW(4) }} />
              <ThemedText type="body" style={navTextStyle}>
                Activity
              </ThemedText>
            </>
          ))}
          <View style={{ width: scaleW(100) }} />
        </View>
      );
    }
  };

  const renderProfileContent = () => (
    <ScrollView
      className="flex-1"
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      bounces={false}
      overScrollMode="never"
    >
      <View style={{
        paddingHorizontal: scaleW(24),
        paddingTop: scaleW(120),
        paddingBottom: scaleW(24),
      }}>
        <ThemedText
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
          type="heading"
          className="text-white"
          style={{
              alignSelf: "center",
              maxWidth: scaleW(200),
              fontSize: scaleW(24),
              lineHeight: scaleW(32),
              fontWeight: "600",
              textAlign: "center",
              marginTop: scaleW(48),
              marginBottom: scaleW(24),
              textShadowColor: "#000",
              textShadowRadius: 3,
              textShadowOffset: { width: 0, height: 0 },
            }}
        >
          Your stats
        </ThemedText>
        <View style={{
          flexDirection: "row",
          justifyContent: "center",
          marginBottom: scaleW(28),
          gap: scaleW(16),
          paddingHorizontal: scaleW(12),
        }}>
          <StatCard
            value={daysPlayed}
            label="Days since started"
            color="pink"
          />
          <StatCard
            value={pointsEarned}
            label="Points earned"
            color="green"
          />
        </View>

        <AnimatedReanimated.View style={profileButtonStyle}>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            onPressIn={() => { profileButtonScale.value = withSpring(0.96, buttonSpring); }}
            onPressOut={() => { profileButtonScale.value = withSpring(1, buttonSpring); }}
            style={[styles.creamButton]}
          >
            <ThemedText
              type="heading"
              style={{
                textAlign: "center",
                fontSize: scaleW(16),
                fontWeight: "600",
              }}
            >
              Your profile
            </ThemedText>
          </Pressable>
        </AnimatedReanimated.View>
      </View>
    </ScrollView>
  );

  const renderActivityContent = () => (
    <ScrollView
      className="flex-1"
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      bounces={false}
      overScrollMode="never"
    >
      <View style={{
        paddingHorizontal: scaleW(24),
        paddingTop: scaleW(8),
        paddingBottom: scaleW(24),
      }}>
        <ThemedText
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
          type="heading"
          className="text-white"
          style={{
              alignSelf: "center",
              maxWidth: scaleW(220),
              fontSize: scaleW(24),
              lineHeight: scaleW(32),
              fontWeight: "600",
              textAlign: "center",
              marginTop: 0,
              marginBottom: scaleW(24),
              textShadowColor: "#000",
              textShadowRadius: 3,
              textShadowOffset: { width: 0, height: 0 },
            }}
        >
          Welcome back, Explorer!
        </ThemedText>

        {teamCardConfig && showTeamCard && (
          <AnimatedReanimated.View style={teamCardStyle}>
            <View style={[styles.bearsCard, { backgroundColor: teamCardConfig.backgroundColor, borderWidth: 4, borderColor: "#FFF" }]}>
              <View className="flex-row items-center flex-1 p-4 overflow-hidden">
                <View style={{ flex: 1, paddingRight: scaleW(8) }}>
                  <ThemedText type="heading" style={{ color: "#000", fontSize: scaleW(20), fontWeight: "600", marginBottom: scaleW(12), lineHeight: scaleW(28) }}>{teamCardConfig.title}</ThemedText>
                  <ThemedText type="body" style={{ color: "#000", fontSize: scaleW(16), lineHeight: scaleW(24) }}>
                    {teamCardMessage}
                  </ThemedText>
                </View>
                <View style={{ width: scaleW(110), height: scaleW(110) }}>
                  <Image
                    source={teamCardConfig.waveImage}
                    resizeMode="contain"
                    onLoadEnd={() => setTeamCardImageReady(true)}
                    onError={() => setTeamCardImageReady(true)}
                    style={[styles.bearImage]}
                  />
                </View>
              </View>
            </View>
          </AnimatedReanimated.View>
        )}

        {shouldRenderClubSection && (
          <AnimatedReanimated.View
            entering={FadeIn.duration(420).easing(Easing.out(Easing.cubic))}
          >
            <View
              style={{
                backgroundColor: "#BBE5EB",
                borderRadius: scaleW(15),
                paddingTop: scaleW(16),
                paddingBottom: scaleW(32),
                borderWidth: 4,
                borderColor: "#FFF",
                shadowColor: "#000",
                shadowOpacity: 0.3,
                shadowRadius: 2,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
                overflow: Platform.OS === "android" ? "visible" : undefined,
              }}
              collapsable={Platform.OS !== "android"}
            >
              <ThemedText type="heading" style={{ color: "#000", fontSize: scaleW(20), fontWeight: "600", marginBottom: scaleW(32), textAlign: "center", lineHeight: scaleW(28) }}>
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
                const status = clubImageStatus[card.id] ?? "loading";
                const centerScrollX = index === 0 ? 0 : getCenterScrollX(index);
                const rotation = clubCardsScrollX.interpolate({
                  inputRange: [
                    centerScrollX - 120,
                    centerScrollX,
                    centerScrollX + 120,
                  ],
                  outputRange: ["-4deg", "0deg", "4deg"],
                  extrapolate: "clamp",
                });
                return (
                  <Animated.View
                    key={card.id}
                    style={[
                      styles.clubCard,
                      {
                        transform: [{ rotate: rotation }],
                      },
                    ]}
                  >
                    <Pressable style={{ flex: 1 }}>
                      <View style={styles.clubCardImageWrap}>
                        <ExpoImage
                          source={{ uri: card.thumb_url || card.photo_url }}
                          style={styles.clubCardImage}
                          contentFit="cover"
                          onLoadEnd={() => {
                            setClubImageStatus((prev) => ({ ...prev, [card.id]: "loaded" }));
                          }}
                          onError={() => {
                            setClubImageStatus((prev) => ({ ...prev, [card.id]: "error" }));
                          }}
                        />
                        {status !== "loaded" && (
                          <View style={styles.clubCardPlaceholder}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          </View>
                        )}
                      <ThemedText type="heading" style={{
                        position: "absolute",
                        bottom: scaleW(40),
                        left: scaleW(10),
                        fontSize: scaleW(18),
                        textAlign: "center",
                        fontWeight: "600",
                        backgroundColor: "#FFF",
                        borderRadius: scaleW(20),
                        paddingHorizontal: scaleW(5),
                      }}>
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
                        paddingHorizontal: scaleW(5),
                      }}>
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
          </AnimatedReanimated.View>
        )}
      </View>
    </ScrollView>
  );

  const renderMissionsContent = () => (
    <ScrollView
      className="flex-1"
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      bounces={false}
      overScrollMode="never"
    >
      <View style={{ paddingHorizontal: scaleW(24), paddingTop: scaleW(8) }}>
        <ThemedText
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
          type="heading"
          className="text-white"
          style={{
              alignSelf: "center",
              fontSize: scaleW(24),
              lineHeight: scaleW(32),
              fontWeight: "600",
              textAlign: "center",
              marginTop: scaleW(48),
              marginBottom: scaleW(24),
              textShadowColor: "#000",
              textShadowRadius: 3,
              textShadowOffset: { width: 0, height: 0 },
            }}
        >
          Latest Mission
        </ThemedText>

        <View collapsable={Platform.OS !== "android"} style={{ alignItems: "center", marginBottom: scaleW(24) }}>
          {missionLoading ? (
            <View style={{ paddingVertical: scaleW(48), alignItems: "center" }}>
              <ActivityIndicator size="large" color="#FFF" />
            </View>
          ) : latestMission ? (
            <MissionCard card={latestMission} tiltDeg={0} />
          ) : null}
        </View>

        <AnimatedReanimated.View style={missionsButtonStyle}>
          <Pressable
            onPress={() => router.push("/(tabs)/missions")}
            onPressIn={() => { missionsButtonScale.value = withSpring(0.96, buttonSpring); }}
            onPressOut={() => { missionsButtonScale.value = withSpring(1, buttonSpring); }}
            style={styles.creamButton}
          >
            <ThemedText type="defaultSemiBold" className="text-huntly-forest text-center font-jua">
              See all missions
            </ThemedText>
          </Pressable>
        </AnimatedReanimated.View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.backgroundContainer,
          {
            transform: [{ translateX: backgroundTranslateX }],
          },
        ]}
      >
        <ImageBackground
          source={BG_IMAGE}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.backgroundOverlay} />
        </ImageBackground>
      </Animated.View>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
        <View className="flex-1" style={styles.container}>
        <View className="flex-1">
        {renderNavigationButtons()}
        <Animated.ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          directionalLockEnabled
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: pagerX } } }],
            { useNativeDriver: true }
          )}
          onMomentumScrollEnd={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            const next = Math.round(x / width);
            setCurrentIndex(next);
          }}
          onScrollEndDrag={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            const next = Math.round(x / width);
            setCurrentIndex(next);
          }}
          style={styles.pager}
          contentContainerStyle={styles.pagerContent}
        >
          <Animated.View style={[styles.pagerPage, pageAnimatedStyles[0] ?? {}]}>
            {renderProfileContent()}
          </Animated.View>
          <Animated.View style={[styles.pagerPage, pageAnimatedStyles[1] ?? {}]}>
            {renderActivityContent()}
          </Animated.View>
          <Animated.View style={[styles.pagerPage, pageAnimatedStyles[2] ?? {}]}>
            {renderMissionsContent()}
          </Animated.View>
        </Animated.ScrollView>
        </View>
        </View>
      </SafeAreaView>

      {teamId != null && (
        <AddJournalEntryModal
          visible={showAddEntryModal}
          onClose={() => setShowAddEntryModal(false)}
          onSuccess={() => setShowAddEntryModal(false)}
          initialActivityTag={initialActivityTag}
        />
      )}

      {showFab && (
        <AnimatedReanimated.View
          style={styles.ctaLayer}
          entering={FadeIn.duration(340).easing(Easing.out(Easing.cubic))}
          exiting={FadeOut.duration(160).easing(Easing.in(Easing.cubic))}
        >
          {showQuickAddMenu && (
            <Pressable
              style={styles.menuOverlay}
              onPress={() => setShowQuickAddMenu(false)}
            />
          )}

          {showQuickAddMenu && (
            <AnimatedReanimated.View
              entering={FadeInDown.duration(180)}
              exiting={FadeOutDown.duration(160)}
              style={styles.quickAddMenu}
            >
              <Pressable style={styles.quickAddButton} onPress={() => router.push("/(tabs)/activity/walk-prep")}>
                <ThemedText type="heading" style={styles.quickAddButtonText}>Walk</ThemedText>
              </Pressable>
              <Pressable
                style={styles.quickAddButton}
                onPress={() => openAddEntry("Cycle" as ActivityTag)}
              >
                <ThemedText type="heading" style={styles.quickAddButtonText}>Cycle</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.quickAddButton,
                  !latestMission && !latestUnfinishedMission ? { opacity: 0.6 } : null,
                ]}
                disabled={!latestMission && !latestUnfinishedMission}
                onPress={goToMission}
              >
                <ThemedText type="heading" style={styles.quickAddButtonText}>Mission</ThemedText>
              </Pressable>
            </AnimatedReanimated.View>
          )}

          <Pressable
            style={styles.fab}
            onPress={() => setShowQuickAddMenu((v) => !v)}
          >
            <AnimatedReanimated.View style={fabIconStyle}>
              <MaterialIcons
                name="add"
                size={scaleW(28)}
                color={HUNTLY_GREEN}
              />
            </AnimatedReanimated.View>
          </Pressable>
        </AnimatedReanimated.View>
      )}
    </View>
  );
}
