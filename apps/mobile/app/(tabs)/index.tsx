import React, { useRef, useState, useEffect, useMemo } from "react";
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
import AnimatedReanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { MissionCard } from "@/components/MissionCard";
import { StatCard } from "@/components/StatCard";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useCurrentChapterActivities } from "@/hooks/useCurrentChapterActivities";
import { useUserStats } from "@/hooks/useUserStats";
import { usePlayer } from "@/contexts/PlayerContext";
import { getTeamById } from "@/services/profileService";
import { getRandomClubPhotos, type ClubPhotoCardItem } from "@/services/activityProgressService";
import { getTeamCardConfig } from "@/utils/teamUtils";

type HomeMode = "profile" | "activity" | "missions";
const HOME_MODES: HomeMode[] = ["profile", "activity", "missions"];

const BG_IMAGE = require("@/assets/images/bg.png");

const CREAM = "#F4F0EB";

/** Pastel/bright author badge colors (white text) for club cards */
const CLUB_CARD_AUTHOR_COLORS = [
  "#D4A05A", // warm amber
  "#8B7BA8", // soft violet
  "#7A9B76", // sage green
  "#5B8A9E", // slate blue
  "#C97B6C", // dusty coral
];

export default function HomeScreen() {
  const { scaleW, width, height } = useLayoutScale();
  const { currentPlayer } = usePlayer();
  const { daysPlayed, pointsEarned } = useUserStats();
  const { nextMission, loading: missionLoading } = useCurrentChapterActivities(currentPlayer?.id ?? null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [clubCards, setClubCards] = useState<ClubPhotoCardItem[]>([]);
  const [clubCardsLoading, setClubCardsLoading] = useState(true);
  const [loadingMoreClubCards, setLoadingMoreClubCards] = useState(false);
  const initialIndex = 1; // activity (Welcome back)
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const currentMode = HOME_MODES[currentIndex] ?? "activity";

  useEffect(() => {
    let cancelled = false;
    setClubCardsLoading(true);
    getRandomClubPhotos(5).then((cards) => {
      if (!cancelled) setClubCards(cards);
    }).catch(() => {
      if (!cancelled) setClubCards([]);
    }).finally(() => {
      if (!cancelled) setClubCardsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const loadMoreClubCards = async () => {
    if (loadingMoreClubCards || clubCards.length === 0) return;
    setLoadingMoreClubCards(true);
    try {
      const excludeIds = clubCards.map((c) => c.id);
      const more = await getRandomClubPhotos(5, excludeIds);
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

  useEffect(() => {
    if (!currentPlayer?.team) {
      setTeamName(null);
      return;
    }
    let cancelled = false;
    getTeamById(currentPlayer.team).then((team) => {
      if (!cancelled && team) setTeamName(team.name);
    });
    return () => { cancelled = true; };
  }, [currentPlayer?.team]);

  const teamCardConfig = teamName ? getTeamCardConfig(teamName) : null;

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
  const bearCardTranslateX = useSharedValue(200);

  const profileButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: profileButtonScale.value }] }));
  const missionsButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: missionsButtonScale.value }] }));
  const navButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: navScale.value }] }));
  const bearCardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: bearCardTranslateX.value }] }));

  useEffect(() => {
    if (width > 0 && teamName) {
      bearCardTranslateX.value = width;
      bearCardTranslateX.value = withDelay(100, withSpring(0, springLessBouncy));
    }
  }, [width, teamName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      pagerRef.current?.scrollTo({ x: width * initialIndex, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [width, initialIndex]);

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
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        bearImage: {
          position: "absolute",
          width: scaleW(140),
          height: scaleW(140),
          bottom: scaleW(-95),
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
        horizontalMissionCardsContainer: {
          paddingLeft: missionCardsPaddingHorizontal,
          paddingRight: missionCardsPaddingHorizontal,
          paddingBottom: scaleW(8),
        },
      }),
    [scaleW, width, height, clubCardsPaddingHorizontal, missionCardsPaddingHorizontal]
  );

  const wrapNavPressable = (onPress: () => void, children: React.ReactNode) => (
    <AnimatedReanimated.View style={navButtonStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { navScale.value = withSpring(0.96, buttonSpring); }}
        onPressOut={() => { navScale.value = withSpring(1, buttonSpring); }}
        className="bg-white/90 rounded-full px-4 py-2 flex-row items-center"
      >
        {children}
      </Pressable>
    </AnimatedReanimated.View>
  );

  const renderNavigationButtons = () => {
    if (currentMode === "profile") {
      return (
        <View className="flex-row items-center justify-between px-6 pt-4">
          <ThemedText type="body" className="text-white font-jua opacity-90">
          </ThemedText>
          {wrapNavPressable(() => switchMode("activity"), (
            <>
              <ThemedText type="body" className="text-huntly-forest font-jua">
                Activity
              </ThemedText>
              <ThemedText className="text-huntly-forest ml-2 font-jua">→</ThemedText>
            </>
          ))}
        </View>
      );
    } else if (currentMode === "activity") {
      return (
        <View className="flex-row items-center justify-between px-6 pt-4">
          {wrapNavPressable(() => switchMode("profile"), (
            <>
              <ThemedText className="text-huntly-forest mr-2 font-jua">←</ThemedText>
              <ThemedText type="body" className="text-huntly-forest font-jua">
                Profile
              </ThemedText>
            </>
          ))}

          {wrapNavPressable(() => switchMode("missions"), (
            <>
              <ThemedText type="body" className="text-huntly-forest font-jua">
                Missions
              </ThemedText>
              <ThemedText className="text-huntly-forest ml-2 font-jua">→</ThemedText>
            </>
          ))}
        </View>
      );
    } else {
      return (
        <View className="flex-row items-center justify-between px-6 pt-4">
          {wrapNavPressable(() => switchMode("activity"), (
            <>
              <ThemedText className="text-huntly-forest mr-2 font-jua">←</ThemedText>
              <ThemedText type="body" className="text-huntly-forest font-jua">
                Activity
              </ThemedText>
            </>
          ))}
          <View style={{ width: scaleW(60) }} />
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
        paddingTop: scaleW(24),
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
              fontWeight: "600",
              textAlign: "center",
              marginTop: scaleW(16),
              marginBottom: scaleW(24),
              textShadowColor: "#000",
              textShadowRadius: 3,
              textShadowOffset: { width: 0, height: 0 },
            }}
        >
          Welcome back, explorer!
        </ThemedText>

        {teamCardConfig && (
          <AnimatedReanimated.View style={bearCardStyle}>
            <View style={[styles.bearsCard, { backgroundColor: teamCardConfig.backgroundColor, borderWidth: 4, borderColor: "#FFF" }]}>
              <View className="flex-row items-center flex-1 overflow-hidden p-4">
                <View className="flex-1">
                  <ThemedText type="heading" style={{ color: "#000", fontSize: scaleW(20), fontWeight: "600", marginBottom: scaleW(16) }}>{teamCardConfig.title}</ThemedText>
                  <ThemedText type="body" style={{ color: "#000", fontSize: scaleW(18), width: scaleW(170), lineHeight: scaleW(20) }}>
                    We're doing great helping test the wind clues this week!
                  </ThemedText>
                </View>
                <View style={{ width: scaleW(120) }}>
                  <Image
                    source={teamCardConfig.waveImage}
                    resizeMode="contain"
                    style={[styles.bearImage]}
                  />
                </View>
              </View>
            </View>
          </AnimatedReanimated.View>
        )}

        {(clubCardsLoading || clubCards.length > 0) && (
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
            <ThemedText type="heading" style={{ color: "#000", fontSize: scaleW(20), fontWeight: "600", marginBottom: scaleW(32), textAlign: "center" }}>
              From around the club
            </ThemedText>
            {clubCardsLoading && clubCards.length === 0 ? (
              <View style={{ minHeight: scaleW(200), justifyContent: "center", alignItems: "center", paddingVertical: scaleW(32) }}>
                <ActivityIndicator size="large" color="#5B8A9E" />
              </View>
            ) : (
            <>
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
                        <Image source={{ uri: card.photo_url }} style={styles.clubCardImage} resizeMode="cover" />
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
            </>
            )}
          </View>
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
              fontWeight: "600",
              textAlign: "center",
              marginTop: scaleW(48),
              marginBottom: scaleW(24),
              textShadowColor: "#000",
              textShadowRadius: 3,
              textShadowOffset: { width: 0, height: 0 },
            }}
        >
          Current Mission
        </ThemedText>

        <View collapsable={Platform.OS !== "android"} style={{ alignItems: "center", marginBottom: scaleW(24) }}>
          {missionLoading ? (
            <View style={{ paddingVertical: scaleW(48), alignItems: "center" }}>
              <ActivityIndicator size="large" color="#FFF" />
            </View>
          ) : nextMission ? (
            <MissionCard card={nextMission} tiltDeg={0} />
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
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      <View className="flex-1" style={styles.container}>
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
  );
}
