import React, { useRef, useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Image,
  ImageBackground,
  Dimensions,
  Animated,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { usePlayer } from "@/contexts/PlayerContext";
import { getTeamById, type Team } from "@/services/profileService";
import { getTeamImageSource } from "@/utils/teamUtils";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type HomeMode = "profile" | "activity" | "missions";
const HOME_MODES: HomeMode[] = ["profile", "activity", "missions"];

const BG_IMAGE = require("@/assets/images/bg.png");

export default function HomeScreen() {
  const { currentPlayer } = usePlayer();
  const initialIndex = 1; // activity
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const currentMode = HOME_MODES[currentIndex] ?? "activity";
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  const pagerRef = useRef<ScrollView>(null);
  const pagerX = useRef(new Animated.Value(SCREEN_WIDTH * initialIndex)).current;
  const backgroundTranslateX = Animated.multiply(pagerX, -1);

  useEffect(() => {
    // Ensure we start centered on Activity (index 1).
    const timer = setTimeout(() => {
      pagerRef.current?.scrollTo({ x: SCREEN_WIDTH * initialIndex, animated: false });
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTeam = async () => {
      const teamId = currentPlayer?.team;
      if (!teamId) {
        setCurrentTeam(null);
        return;
      }

      setIsLoadingTeam(true);
      try {
        const team = await getTeamById(teamId);
        if (!cancelled) setCurrentTeam(team);
      } catch (error) {
        console.error("Error loading current player's team:", error);
        if (!cancelled) setCurrentTeam(null);
      } finally {
        if (!cancelled) setIsLoadingTeam(false);
      }
    };

    loadTeam();

    return () => {
      cancelled = true;
    };
  }, [currentPlayer?.team]);

  const switchMode = (mode: HomeMode) => {
    const nextIndex = HOME_MODES.indexOf(mode);
    if (nextIndex < 0) return;

    pagerRef.current?.scrollTo({ x: SCREEN_WIDTH * nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  };

  const renderNavigationButtons = () => {
    if (currentMode === "profile") {
      return (
        <View className="flex-row items-center justify-end px-6 pt-4">
          <Pressable
            onPress={() => switchMode("activity")}
            className="bg-white/90 rounded-full px-4 py-2 flex-row items-center"
          >
            <ThemedText type="body" className="text-huntly-forest font-jua">
              Activity
            </ThemedText>
            <ThemedText className="text-huntly-forest ml-2 font-jua">→</ThemedText>
          </Pressable>
        </View>
      );
    } else if (currentMode === "activity") {
      return (
        <View className="flex-row items-center justify-between px-6 pt-4">
          <Pressable
            onPress={() => switchMode("profile")}
            className="bg-white/90 rounded-full px-4 py-2 flex-row items-center"
          >
            <ThemedText className="text-huntly-forest mr-2 font-jua">←</ThemedText>
            <ThemedText type="body" className="text-huntly-forest font-jua">
              Profile
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => switchMode("missions")}
            className="bg-white/90 rounded-full px-4 py-2 flex-row items-center"
          >
            <ThemedText type="body" className="text-huntly-forest font-jua">
              Missions
            </ThemedText>
            <ThemedText className="text-huntly-forest ml-2 font-jua">→</ThemedText>
          </Pressable>
        </View>
      );
    } else {
      return (
        <View className="flex-row items-center justify-start px-6 pt-4">
          <Pressable
            onPress={() => switchMode("activity")}
            className="bg-white/90 rounded-full px-4 py-2 flex-row items-center"
          >
            <ThemedText className="text-huntly-forest mr-2 font-jua">←</ThemedText>
            <ThemedText type="body" className="text-huntly-forest font-jua">
              Activity
            </ThemedText>
          </Pressable>
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
    >
      <View className="px-6 pt-4">
        <ThemedText type="title" className="text-white mb-6 text-center">
          Your Stats
        </ThemedText>

        <View className="flex-row justify-between mb-6">
          <View className="bg-white/90 rounded-2xl p-6 flex-1 mr-3">
            <ThemedText type="heading" className="text-huntly-forest text-center mb-2">
              41
            </ThemedText>
            <ThemedText type="body" className="text-huntly-charcoal text-center">
              Days played
            </ThemedText>
          </View>

          <View className="bg-white/90 rounded-2xl p-6 flex-1 ml-3">
            <ThemedText type="heading" className="text-huntly-forest text-center mb-2">
              139
            </ThemedText>
            <ThemedText type="body" className="text-huntly-charcoal text-center">
              Points Earned
            </ThemedText>
          </View>
        </View>

        <Pressable className="bg-white/90 rounded-2xl p-4 mb-6">
          <ThemedText type="defaultSemiBold" className="text-huntly-forest text-center font-jua">
            Your profile
          </ThemedText>
        </Pressable>

        <View className="bg-white/90 rounded-2xl p-6 mb-6">
          <ThemedText type="subtitle" className="text-huntly-forest mb-4">
            Recent Achievements
          </ThemedText>
          <View className="space-y-3">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-huntly-mint rounded-full items-center justify-center mr-4">
                <ThemedText className="text-2xl">🏆</ThemedText>
              </View>
              <View className="flex-1">
                <ThemedText type="defaultSemiBold" className="text-huntly-forest">
                  First Steps
                </ThemedText>
                <ThemedText type="caption" className="text-huntly-brown">
                  Completed your first activity
                </ThemedText>
              </View>
            </View>
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-huntly-amber rounded-full items-center justify-center mr-4">
                <ThemedText className="text-2xl">⭐</ThemedText>
              </View>
              <View className="flex-1">
                <ThemedText type="defaultSemiBold" className="text-huntly-forest">
                  Explorer
                </ThemedText>
                <ThemedText type="caption" className="text-huntly-brown">
                  Completed 10 activities
                </ThemedText>
              </View>
            </View>
          </View>
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
    >
      <View className="px-6 pt-4">
        <ThemedText type="title" className="text-white mb-2 text-center">
          Let's explore!
        </ThemedText>

        <View className="bg-white/90 rounded-2xl p-6 mb-6">
          <ThemedText type="subtitle" className="text-huntly-forest mb-4">
            Welcome back, {currentPlayer?.name || "Explorer"}!
          </ThemedText>
          <ThemedText type="body" className="text-huntly-charcoal mb-4">
            We're doing great helping test the wind clues this week!
          </ThemedText>
          <View className="flex-row items-center">
            <View
              className="w-16 h-16 bg-huntly-amber rounded-full items-center justify-center mr-4"
              style={currentTeam?.colour ? { backgroundColor: currentTeam.colour } : undefined}
            >
              {currentTeam?.name && getTeamImageSource(currentTeam.name) ? (
                <Image
                  source={getTeamImageSource(currentTeam.name)!}
                  style={styles.teamAvatarImage}
                  resizeMode="contain"
                />
              ) : (
                <ThemedText className="text-3xl">
                  {(currentTeam?.mascot_name || "👥").slice(0, 2)}
                </ThemedText>
              )}
            </View>
            <View className="flex-1">
              <ThemedText type="defaultSemiBold" className="text-huntly-forest">
                {currentTeam?.name || (isLoadingTeam ? "Loading team..." : "Your team")}
              </ThemedText>
              <ThemedText type="caption" className="text-huntly-brown">
                {currentTeam?.mascot_name ? `${currentTeam.mascot_name} team` : "Your team"}
              </ThemedText>
            </View>
          </View>
        </View>

        <View className="bg-white/90 rounded-2xl p-6 mb-6">
          <ThemedText type="subtitle" className="text-huntly-forest mb-4">
            From around the club
          </ThemedText>
          <View className="space-y-4">
            <View className="bg-huntly-mint/30 rounded-xl p-4">
              <ThemedText type="defaultSemiBold" className="text-huntly-forest mb-2">
                New Activity Available
              </ThemedText>
              <ThemedText type="body" className="text-huntly-charcoal">
                Build a Laser Maze - Create a laser maze using string, wool or tape.
              </ThemedText>
            </View>
            <View className="bg-huntly-amber/30 rounded-xl p-4">
              <ThemedText type="defaultSemiBold" className="text-huntly-forest mb-2">
                Team Update
              </ThemedText>
              <ThemedText type="body" className="text-huntly-charcoal">
                The Foxes completed 5 activities this week!
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderMissionsContent = () => (
    <ScrollView
      className="flex-1"
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      <View className="px-6 pt-4">
        <ThemedText type="title" className="text-white mb-6 text-center">
          Missions
        </ThemedText>

        <View className="bg-white/90 rounded-2xl p-6 mb-6">
          <ThemedText type="subtitle" className="text-huntly-forest mb-4">
            Your help is needed!
          </ThemedText>

          <View className="bg-huntly-leaf/20 rounded-xl p-4 mb-4">
            <ThemedText type="defaultSemiBold" className="text-huntly-forest mb-2">
              Build a Laser Maze
            </ThemedText>
            <ThemedText type="body" className="text-huntly-charcoal mb-4">
              Create a laser maze using string, wool or tape. Rules are up to you: time limit, penalties, silent mode.
            </ThemedText>
            <Pressable className="bg-huntly-leaf rounded-xl py-3">
              <ThemedText type="defaultSemiBold" className="text-white text-center font-jua">
                Start
              </ThemedText>
            </Pressable>
          </View>

          <View className="bg-huntly-mint/30 rounded-xl p-4 mb-4">
            <ThemedText type="defaultSemiBold" className="text-huntly-forest mb-2">
              Listen for Wind Sounds
            </ThemedText>
            <ThemedText type="body" className="text-huntly-charcoal mb-4">
              Go outside and listen carefully to the sounds the wind makes. What do you hear?
            </ThemedText>
            <Pressable className="bg-huntly-mint rounded-xl py-3">
              <ThemedText type="defaultSemiBold" className="text-huntly-forest text-center font-jua">
                Start
              </ThemedText>
            </Pressable>
          </View>

          <View className="bg-huntly-amber/30 rounded-xl p-4">
            <ThemedText type="defaultSemiBold" className="text-huntly-forest mb-2">
              Help Build a Wind Catcher
            </ThemedText>
            <ThemedText type="body" className="text-huntly-charcoal mb-4">
              Work with your team to build a wind catcher and see how it moves in the breeze.
            </ThemedText>
            <Pressable className="bg-huntly-amber rounded-xl py-3">
              <ThemedText type="defaultSemiBold" className="text-huntly-forest text-center font-jua">
                Start
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <Pressable className="bg-white/90 rounded-2xl p-4">
          <ThemedText type="defaultSemiBold" className="text-huntly-forest text-center font-jua">
            See all missions
          </ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );

  return (
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

      <SafeAreaView edges={["top"]} className="flex-1">
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
            const next = Math.round(x / SCREEN_WIDTH);
            setCurrentIndex(next);
          }}
          onScrollEndDrag={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            const next = Math.round(x / SCREEN_WIDTH);
            setCurrentIndex(next);
          }}
          style={styles.pager}
          contentContainerStyle={styles.pagerContent}
        >
          <View style={styles.pagerPage}>{renderProfileContent()}</View>
          <View style={styles.pagerPage}>{renderActivityContent()}</View>
          <View style={styles.pagerPage}>{renderMissionsContent()}</View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  backgroundContainer: {
    position: "absolute",
    width: SCREEN_WIDTH * 3,
    height: SCREEN_HEIGHT,
    left: 0,
    top: 0,
  },
  backgroundImage: {
    width: SCREEN_WIDTH * 3,
    height: SCREEN_HEIGHT,
  },
  backgroundOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  contentContainer: {
    paddingBottom: 100,
  },
  pager: {
    flex: 1,
  },
  pagerContent: {
    width: SCREEN_WIDTH * HOME_MODES.length,
  },
  pagerPage: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  teamAvatarImage: {
    width: 44,
    height: 44,
  },
});
