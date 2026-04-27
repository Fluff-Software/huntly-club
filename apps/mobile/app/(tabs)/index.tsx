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
  type NativeScrollEvent } from "react-native";
import { Image as ExpoImage } from "expo-image";
import AnimatedReanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
  FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { MissionCard } from "@/components/MissionCard";
import { AdventureTile } from "@/components/AdventureTile";
import { PastAdventuresTile } from "@/components/PastAdventuresTile";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useCurrentChapterActivities } from "@/hooks/useCurrentChapterActivities";
import { useUser } from "@/contexts/UserContext";
import { getRandomClubPhotos, type ClubPhotoCardItem } from "@/services/activityProgressService";
import { getTeamCardConfig } from "@/utils/teamUtils";

type HomeMode = "profile" | "activity" | "missions";
const HOME_MODES: HomeMode[] = ["profile", "activity", "missions"];

const BG_IMAGE = require("@/assets/images/bg.png");

const CREAM = "#F4F0EB";
const HUNTLY_GREEN = "#4F6F52";

const CLUB_CARDS_PAGE_SIZE = 6;
const CLUB_CARDS_MAX = 24;

const TEAM_CARD_SLIDE_DURATION_MS = 420;

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

const SPEECH_BUBBLE_MESSAGES = (leaderName: string) => [
  `Welcome back, explorer! What will you do today?`,
  `Ready for adventure? ${leaderName} is cheering you on.`,
  `Time to get going, explorer.`,
  `What kind of adventure are you in the mood for today?`,
  `Your next mission starts when you do.`,
  `Let's see where today takes you.`,
  `Ready to explore something new today?`,
  `Another day, another adventure.`,
  `Let's make today an adventure.`,
  `Where will you wander today?`,
  `Boots on? Let's go.`,
  `What will you discover today?`,
  `Go on — pick something fun to do.`,
  `The outdoors is waiting for you.`,
  `A good day for an adventure, don't you think?`,
  `Start small or go big — just get out there.`,
  `What's your plan for today, explorer?`,
  `Choose your path and let's get moving.`,
  `Your adventure is waiting.`,
  `Let's get out there and do something brilliant.`,
];

export default function HomeScreen() {
  const { scaleW, width, height } = useLayoutScale();
  const { team, teamId, daysPlayed, pointsEarned } = useUser();
  const {
    latestMission,
    latestUnfinishedMission,
    loading: missionLoading,
    refetch: refetchMissions } = useCurrentChapterActivities(null);
  const [clubCards, setClubCards] = useState<ClubPhotoCardItem[]>([]);
  const [clubCardsLoading, setClubCardsLoading] = useState(true);
  const [loadingMoreClubCards, setLoadingMoreClubCards] = useState(false);
  const [clubImageStatus, setClubImageStatus] = useState<Record<string, "loading" | "loaded" | "error">>({});
  const [showClubSection, setShowClubSection] = useState(false);
  const [missionsTab, setMissionsTab] = useState<"missions" | "adventures">("missions");
  const initialIndex = 1; // activity (Welcome back)
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const currentMode = HOME_MODES[currentIndex] ?? "activity";
  const teamCardMessage = useMemo(() => TEAM_CARD_MESSAGES[Math.floor(Math.random() * TEAM_CARD_MESSAGES.length)], []);
  const speechBubbleMessage = useMemo(() => {
    const msgs = SPEECH_BUBBLE_MESSAGES(teamCardConfig?.leaderName ?? "");
    return msgs[Math.floor(Math.random() * msgs.length)];
  }, [teamCardConfig?.leaderName]);

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

  const buttonSpring = { damping: 15, stiffness: 400 };
  const profileButtonScale = useSharedValue(1);
  const missionsButtonScale = useSharedValue(1);
  const navScale = useSharedValue(1);
  const teamCardTranslateX = useSharedValue(240);
  const teamCardOpacity = useSharedValue(0);
  const missionsButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: missionsButtonScale.value }] }));
  const navButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: navScale.value }] }));
  const teamCardStyle = useAnimatedStyle(() => ({
    opacity: teamCardOpacity.value,
    transform: [{ translateX: teamCardTranslateX.value }] }));

  // Slide the team card in after a short fixed delay — no image-load dependency.
  useEffect(() => {
    teamCardTranslateX.value = 240;
    teamCardOpacity.value = 0;
    if (!teamCardConfig) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      teamCardTranslateX.value = withTiming(0, { duration: TEAM_CARD_SLIDE_DURATION_MS, easing: Easing.out(Easing.cubic) });
      teamCardOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [teamCardConfig, teamCardOpacity, teamCardTranslateX]);

  // Show club section as soon as data is ready.
  useEffect(() => {
    setShowClubSection(false);
    if (clubCardsLoading || clubCards.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) setShowClubSection(true); }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [clubCardsLoading, clubCards.length]);

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
          extrapolate: "clamp" }),
        transform: [
          {
            translateY: pagerX.interpolate({
              inputRange: [0, w],
              outputRange: [0, inactiveOffset],
              extrapolate: "clamp" }) },
        ] },
      {
        opacity: pagerX.interpolate({
          inputRange: [0, w - fadeEdge, w, w + fadeEdge, w * 2],
          outputRange: [inactiveOpacity, 0.6, 1, 0.6, inactiveOpacity],
          extrapolate: "clamp" }),
        transform: [
          {
            translateY: pagerX.interpolate({
              inputRange: [0, w, w * 2],
              outputRange: [inactiveOffset, 0, inactiveOffset],
              extrapolate: "clamp" }) },
        ] },
      {
        opacity: pagerX.interpolate({
          inputRange: [w, w * 2 - fadeEdge, w * 2],
          outputRange: [inactiveOpacity, 0.6, 1],
          extrapolate: "clamp" }),
        transform: [
          {
            translateY: pagerX.interpolate({
              inputRange: [w, w * 2],
              outputRange: [inactiveOffset, 0],
              extrapolate: "clamp" }) },
        ] },
    ] as const;
  }, [width, pagerX]);

  const switchMode = (mode: HomeMode) => {
    const nextIndex = HOME_MODES.indexOf(mode);
    if (nextIndex < 0) return;

    pagerRef.current?.scrollTo({ x: width * nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, overflow: "hidden" as const },
        backgroundContainer: {
          position: "absolute" as const,
          width: width * 3,
          height,
          left: 0,
          top: 0 },
        backgroundImage: { width: width * 3, height },
        backgroundOverlay: {
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.1)" },
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
          elevation: 2 },
        bearsCard: {
          borderRadius: scaleW(15),
          marginBottom: scaleW(20),
          minHeight: scaleW(160),
          width: "100%",
          overflow: "hidden" as const,
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2 },
        bearImage: {
          position: "absolute",
          width: scaleW(150),
          height: scaleW(200),
          right: 0,
          bottom: 0 },
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
        clubCardPlaceholder: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: HUNTLY_GREEN,
          justifyContent: "center",
          alignItems: "center" },
        horizontalMissionCardsContainer: {
          paddingLeft: missionCardsPaddingHorizontal,
          paddingRight: missionCardsPaddingHorizontal,
          paddingBottom: scaleW(8) } }),
    [
      scaleW,
      width,
      height,
      clubCardsPaddingHorizontal,
      missionCardsPaddingHorizontal,
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
          alignItems: "center" }}
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
      <View style={{ paddingHorizontal: scaleW(24), paddingTop: scaleW(20), paddingBottom: scaleW(24), gap: scaleW(16) }}>
        <AdventureTile />

        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: scaleW(12) }}>
          <View style={{
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.9)",
            borderRadius: scaleW(16),
            borderWidth: 3,
            borderColor: '#E07B20',
            padding: scaleW(16),
            alignItems: "center",
            gap: scaleW(6),
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2 }}>
            <View style={{ backgroundColor: "#FFF3E0", borderRadius: scaleW(12), padding: scaleW(8) }}>
              <MaterialIcons name="star" size={scaleW(22)} color="#E07B20" />
            </View>
            <ThemedText type="heading" style={{ fontSize: scaleW(26), fontWeight: "800", color: "#E07B20" }}>
              {pointsEarned}
            </ThemedText>
            <ThemedText style={{ fontSize: scaleW(12), fontWeight: "600", color: "#888", textAlign: "center" }}>
              Points earned
            </ThemedText>
          </View>
          <View style={{
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.9)",
            borderRadius: scaleW(16),
            borderWidth: 3,
            borderColor: '#4F6F52',
            padding: scaleW(16),
            alignItems: "center",
            gap: scaleW(6),
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2 }}>
            <View style={{ backgroundColor: "#E8F5E9", borderRadius: scaleW(12), padding: scaleW(8) }}>
              <MaterialIcons name="eco" size={scaleW(22)} color="#4F6F52" />
            </View>
            <ThemedText type="heading" style={{ fontSize: scaleW(26), fontWeight: "800", color: "#4F6F52" }}>
              {daysPlayed}
            </ThemedText>
            <ThemedText style={{ fontSize: scaleW(12), fontWeight: "600", color: "#888", textAlign: "center" }}>
              Days exploring
            </ThemedText>
          </View>
        </View>

        {/* Your team compact card */}
        {teamCardConfig && (
          <View style={{
            backgroundColor: teamCardConfig.backgroundColor,
            borderRadius: scaleW(16),
            padding: scaleW(16),
            borderWidth: 3,
            borderColor: '#FFF',
            flexDirection: "row",
            alignItems: "center",
            gap: scaleW(14),
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2 }}>
            <Image
              source={teamCardConfig.badgeImage}
              resizeMode="contain"
              style={{ width: scaleW(52), height: scaleW(52) }}
            />
            <View style={{ flex: 1 }}>
              <ThemedText
                type="heading"
                style={{ fontSize: scaleW(18), fontWeight: "800", color: teamCardConfig.accentColor }}
              >
                {teamCardConfig.title}
              </ThemedText>
              <ThemedText style={{ fontSize: scaleW(13), fontWeight: "600", color: teamCardConfig.leaderColor }}>
                {teamCardConfig.leaderPossessive} team
              </ThemedText>
            </View>
            <Image
              source={teamCardConfig.characterImage}
              resizeMode="contain"
              style={{ width: scaleW(52), height: scaleW(52) }}
            />
          </View>
        )}

        {/* Profile button */}
        <View>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            onPressIn={() => { profileButtonScale.value = withSpring(0.96, buttonSpring); }}
            onPressOut={() => { profileButtonScale.value = withSpring(1, buttonSpring); }}
            style={[styles.creamButton]}
          >
            <ThemedText
              type="heading"
              style={{ textAlign: "center", fontSize: scaleW(16), fontWeight: "600" }}
            >
              Your profile
            </ThemedText>
          </Pressable>
        </View>
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
      <View style={{ paddingHorizontal: scaleW(24), paddingTop: scaleW(8), paddingBottom: scaleW(24), gap: scaleW(16) }}>

        {/* Header */}
        <View style={{
          alignSelf: "flex-start",
          marginTop: scaleW(16),
          backgroundColor: "rgba(0,0,0,0.45)",
          borderRadius: scaleW(16),
          paddingVertical: scaleW(10),
          paddingHorizontal: scaleW(14),
          gap: scaleW(3) }}>
          <ThemedText
            type="heading"
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{ fontSize: scaleW(22), fontWeight: "800" }}
          >
            Welcome back, Explorer!
          </ThemedText>
          <ThemedText
            lightColor="rgba(255,255,255,0.85)"
            darkColor="rgba(255,255,255,0.85)"
            style={{ fontSize: scaleW(14), fontWeight: "500" }}
          >
            Here's what's happening
          </ThemedText>
        </View>

        {/* Character + speech bubble */}
        {teamCardConfig && (
          <AnimatedReanimated.View style={teamCardStyle}>
            <View style={{
              backgroundColor: teamCardConfig.backgroundColor,
              borderRadius: scaleW(20),
              borderWidth: 3,
              borderColor: "#FFF",
              overflow: "hidden",
              minHeight: scaleW(200),
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3 }}>
              {/* Background scene */}
              <Image
                source={teamCardConfig.bgImage}
                resizeMode="cover"
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              />
              {/* Standing character — right side, slightly overflowing top */}
              <Image
                source={teamCardConfig.standingImage}
                resizeMode="contain"
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: scaleW(-8),
                  width: scaleW(170),
                  height: scaleW(210) }}
              />
              {/* Left content */}
              <View style={{ marginRight: scaleW(150), padding: scaleW(16), gap: scaleW(12) }}>
                {/* Badge + name row */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: scaleW(8) }}>
                  <Image
                    source={teamCardConfig.badgeImage}
                    resizeMode="contain"
                    style={{ width: scaleW(36), height: scaleW(36) }}
                  />
                  <ThemedText
                    type="heading"
                    style={{ color: teamCardConfig.accentColor, fontSize: scaleW(18), fontWeight: "800" }}
                  >
                    {teamCardConfig.title}
                  </ThemedText>
                </View>
                {/* Speech bubble with tail */}
                <View style={{ position: "relative" }}>
                  <View style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: scaleW(14),
                    padding: scaleW(12),
                    shadowColor: "#000",
                    shadowOpacity: 0.12,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 3 }}>
                    <ThemedText style={{ fontSize: scaleW(16), lineHeight: scaleW(20), color: "#333", fontStyle: "italic" }}>
                      "{speechBubbleMessage}"
                    </ThemedText>
                  </View>
                  {/* Tail pointing right toward character */}
                  <View style={{
                    position: "absolute",
                    right: scaleW(-10),
                    top: scaleW(14),
                    width: 0,
                    height: 0,
                    borderTopWidth: scaleW(8),
                    borderBottomWidth: scaleW(8),
                    borderLeftWidth: scaleW(10),
                    borderTopColor: "transparent",
                    borderBottomColor: "transparent",
                    borderLeftColor: "#FFFFFF" }}
                  />
                </View>
              </View>
            </View>
          </AnimatedReanimated.View>
        )}

        {/* Club photos */}
        {showClubSection && (
          <AnimatedReanimated.View
            entering={FadeIn.duration(420).easing(Easing.out(Easing.cubic))}
          >
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
              <ThemedText type="heading" style={{ color: "#1A5C6B", fontSize: scaleW(16), fontWeight: "700", marginBottom: scaleW(14), textAlign: "center" }}>
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
      <View style={{ paddingHorizontal: scaleW(24), paddingTop: scaleW(8), paddingBottom: scaleW(24), gap: scaleW(16) }}>
        {/* Header */}
        <View style={{
          alignSelf: "flex-start",
          marginTop: scaleW(16),
          backgroundColor: "rgba(0,0,0,0.45)",
          borderRadius: scaleW(16),
          paddingVertical: scaleW(10),
          paddingHorizontal: scaleW(14),
          gap: scaleW(3) }}>
          <ThemedText
            type="heading"
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{ fontSize: scaleW(22), fontWeight: "800" }}
          >
            Your help is needed!
          </ThemedText>
          <ThemedText
            lightColor="rgba(255,255,255,0.85)"
            darkColor="rgba(255,255,255,0.85)"
            style={{ fontSize: scaleW(14), fontWeight: "500" }}
          >
            Choose a mission or adventure
          </ThemedText>
        </View>

        {/* Missions / Adventures tabs */}
        {/* <View style={{
          flexDirection: "row",
          backgroundColor: "rgba(0,0,0,0.25)",
          borderRadius: scaleW(14),
          padding: scaleW(4),
          gap: scaleW(4) }}>
          <Pressable
            onPress={() => setMissionsTab("missions")}
            style={{
              flex: 1,
              paddingVertical: scaleW(10),
              borderRadius: scaleW(10),
              alignItems: "center",
              backgroundColor: missionsTab === "missions" ? CREAM : "transparent",
              flexDirection: "row",
              justifyContent: "center",
              gap: scaleW(6) }}
          >
            <ThemedText style={{ fontSize: scaleW(14), fontWeight: "700", color: missionsTab === "missions" ? HUNTLY_GREEN : "rgba(255,255,255,0.8)" }}>
              Missions
            </ThemedText>
            <View style={{ backgroundColor: "#E07B20", borderRadius: scaleW(8), paddingHorizontal: scaleW(6), paddingVertical: scaleW(1) }}>
              <ThemedText style={{ fontSize: scaleW(10), fontWeight: "800", color: "#FFF" }}>New!</ThemedText>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setMissionsTab("adventures")}
            style={{
              flex: 1,
              paddingVertical: scaleW(10),
              borderRadius: scaleW(10),
              alignItems: "center",
              backgroundColor: missionsTab === "adventures" ? CREAM : "transparent" }}
          >
            <ThemedText style={{ fontSize: scaleW(14), fontWeight: "700", color: missionsTab === "adventures" ? HUNTLY_GREEN : "rgba(255,255,255,0.8)" }}>
              Adventures
            </ThemedText>
          </Pressable>
        </View> */}

        {/* Mission card */}
        <View collapsable={Platform.OS !== "android"} style={{ alignItems: "center" }}>
          {missionLoading ? (
            <View style={{ paddingVertical: scaleW(32), alignItems: "center" }}>
              <ActivityIndicator size="large" color="#FFF" />
            </View>
          ) : latestMission ? (
            <MissionCard card={latestMission} tiltDeg={0} />
          ) : null}
        </View>

        {/* OR divider */}
        <View style={{ alignItems: "center" }}>
          <View style={{
            backgroundColor: "rgba(0,0,0,0.45)",
            borderRadius: scaleW(20),
            paddingVertical: scaleW(5),
            paddingHorizontal: scaleW(18) }}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ fontSize: scaleW(13), fontWeight: "700" }}>
              OR
            </ThemedText>
          </View>
        </View>

        <AdventureTile />

        <PastAdventuresTile />
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.backgroundContainer,
          {
            transform: [{ translateX: backgroundTranslateX }] },
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

    </View>
  );
}
