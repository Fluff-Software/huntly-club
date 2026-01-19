import React, { useRef, useState, useEffect } from "react";
import {
  View,
  ScrollView,
  ImageBackground,
  Dimensions,
  Animated,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { usePlayer } from "@/contexts/PlayerContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type HomeMode = "profile" | "activity" | "missions";

const BG_IMAGE = require("@/assets/images/bg.png");

export default function HomeScreen() {
  const { currentPlayer } = usePlayer();
  const [currentMode, setCurrentMode] = useState<HomeMode>("activity");
  const [displayedMode, setDisplayedMode] = useState<HomeMode>("activity");
  // Calculate background scroll positions
  // The background image will be 3x screen width to show different sections
  const profileOffset = 0;
  const activityOffset = -SCREEN_WIDTH;
  const missionsOffset = -SCREEN_WIDTH * 2;
  
  // Initialize scrollX to activity offset since that's the default mode
  const scrollX = useRef(new Animated.Value(activityOffset)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip animation on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only animate if mode actually changed
    if (currentMode === displayedMode) {
      return;
    }

    let targetOffset: number;
    switch (currentMode) {
      case "profile":
        targetOffset = profileOffset;
        break;
      case "activity":
        targetOffset = activityOffset;
        break;
      case "missions":
        targetOffset = missionsOffset;
        break;
      default:
        targetOffset = activityOffset;
    }

    // Sequence: fade out current -> change displayed mode -> move background -> delay -> fade in new
    Animated.sequence([
      // Fade out current content
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After fade out completes, change the displayed content
      setDisplayedMode(currentMode);
      
      // Then animate background and fade in
      Animated.sequence([
        // Move background
        Animated.timing(scrollX, {
          toValue: targetOffset,
          duration: 400,
          useNativeDriver: true,
        }),
        // Small delay
        Animated.delay(100),
        // Fade in new content
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [currentMode, displayedMode, scrollX, contentOpacity]);

  const switchMode = (mode: HomeMode) => {
    setCurrentMode(mode);
  };

  const renderNavigationButtons = () => {
    if (displayedMode === "profile") {
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
    } else if (displayedMode === "activity") {
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
            <View className="w-16 h-16 bg-huntly-amber rounded-full items-center justify-center mr-4">
              <ThemedText className="text-3xl">🐻</ThemedText>
            </View>
            <View className="flex-1">
              <ThemedText type="defaultSemiBold" className="text-huntly-forest">
                Bears
              </ThemedText>
              <ThemedText type="caption" className="text-huntly-brown">
                Your team
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
            transform: [{ translateX: scrollX }],
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
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              opacity: contentOpacity,
            },
          ]}
        >
          {displayedMode === "profile" && renderProfileContent()}
          {displayedMode === "activity" && renderActivityContent()}
          {displayedMode === "missions" && renderMissionsContent()}
        </Animated.View>
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
  contentWrapper: {
    flex: 1,
  },
});
