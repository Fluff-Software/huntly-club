import React, { useState, useEffect } from "react";
import {
  View,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useSignUp } from "@/contexts/SignUpContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { getTeams, createProfile } from "@/services/profileService";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const HUNTLY_GREEN = "#4F6F52";
const CREAM = "#F4F0EB";

const HARDCODED_TEAMS = [
  {
    name: "Bears",
    description: "Guided by Bella, bears are brave and curious",
    leaderName: "Bella",
    backgroundColor: "#E8C4B8",
    image: require("@/assets/images/bear-wave.png"),
    imageOnLeft: false,
  },
  {
    name: "Foxes",
    description: "With Felix, foxes are quick and creative",
    leaderName: "Felix",
    backgroundColor: "#B8D4E8",
    image: require("@/assets/images/fox.png"),
    imageOnLeft: true,
  },
  {
    name: "Otters",
    description: "Led by Oli, otters are clever and playful",
    leaderName: "Oli",
    backgroundColor: "#E8E4B8",
    image: require("@/assets/images/otter.png"),
    imageOnLeft: false,
  },
] as const;

const springBounce = { damping: 15, stiffness: 120 };

export default function SignUpTeamScreen() {
  const { scaleW, width } = useLayoutScale();
  const {
    players,
    setSelectedTeamName,
    clearSignUpData,
    setShowPostSignUpWelcome,
    setTutorialStep,
  } = useSignUp();
  const { user } = useAuth();
  const { refreshProfiles } = usePlayer();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const card0Translate = useSharedValue(400);
  const card1Translate = useSharedValue(-400);
  const card2Translate = useSharedValue(400);
  const enterScale = useSharedValue(1);

  const card0Style = useAnimatedStyle(() => ({ transform: [{ translateX: card0Translate.value }] }));
  const card1Style = useAnimatedStyle(() => ({ transform: [{ translateX: card1Translate.value }] }));
  const card2Style = useAnimatedStyle(() => ({ transform: [{ translateX: card2Translate.value }] }));
  const enterAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: enterScale.value }] }));

  useEffect(() => {
    if (width === 0) return;
    card0Translate.value = width;
    card1Translate.value = -width;
    card2Translate.value = width;
    card0Translate.value = withDelay(0, withSpring(0, springBounce));
    card1Translate.value = withDelay(200, withSpring(0, springBounce));
    card2Translate.value = withDelay(400, withSpring(0, springBounce));
  }, [width]);

  const handleEnterHuntlyWorld = async () => {
    if (!selectedName) return;
    if (!user) {
      Alert.alert("Error", "You must be signed in to continue. Please verify your email.");
      return;
    }

    setSelectedTeamName(selectedName);
    setCreating(true);

    try {
      if (players.length === 0) {
        Alert.alert("Add explorers", "Please go back and add at least one explorer.");
        return;
      }

      const teams = await getTeams();
      const team = teams.find((t) => t.name.toLowerCase() === selectedName.toLowerCase());
      const teamId = team?.id ?? teams[0]?.id;
      if (!teams.length || !teamId) {
        Alert.alert(
          "Setup required",
          "Teams could not be loaded. Try resetting the database (e.g. make reset) so migrations run."
        );
        return;
      }

      for (const player of players) {
        await createProfile({
          user_id: user.id,
          name: player.name,
          colour: player.colour,
          team: teamId,
          nickname: player.nickname,
        });
      }
      await refreshProfiles();
      clearSignUpData();
      setTutorialStep("intro");
      setShowPostSignUpWelcome(true);
      router.replace("/(tabs)");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create profiles.";
      Alert.alert("Error", message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ title: "Choose your team", headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: HUNTLY_GREEN }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: scaleW(24),
            paddingVertical: scaleW(24),
          }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500).delay(0)}>
            <ThemedText
              type="heading"
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                textAlign: "center",
                fontWeight: "600",
                fontSize: scaleW(24),
              }}
            >
              Choose your team
            </ThemedText>
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                textAlign: "center",
                fontSize: scaleW(16),
                opacity: 0.95,
                marginTop: scaleW(8),
                marginBottom: scaleW(32),
                lineHeight: scaleW(24),
              }}
            >
              You'll all explore together as one team.
            </ThemedText>
          </Animated.View>

          {HARDCODED_TEAMS.map((team, index) => {
            const isSelected = selectedName === team.name;
            const descriptionParts = team.description.split(team.leaderName);
            const cardStyle = index === 0 ? card0Style : index === 1 ? card1Style : card2Style;

            return (
              <Animated.View key={team.name} style={cardStyle}>
              <Pressable
                onPress={() => setSelectedName(team.name)}
                style={{
                  backgroundColor: team.backgroundColor,
                  borderRadius: scaleW(20),
                  padding: scaleW(20),
                  marginBottom: scaleW(16),
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 3,
                  borderColor: isSelected ? "#FFF" : "#0000",
                  overflow: "hidden",
                }}
              >
                {team.imageOnLeft ? (
                  <View style={{ height: scaleW(100), flex: 1 }}>
                    <Image
                      source={team.image}
                      resizeMode="contain"
                      style={{
                        position: "absolute",
                        width: scaleW(170),
                        height: scaleW(170),
                        bottom: scaleW(-73),
                      }}
                    />
                  </View>
                ) : null}
                  <View style={{ flex: 1 }}>
                      <ThemedText
                        type="heading"
                        lightColor="#5C4033"
                        darkColor="#5C4033"
                        style={{
                          fontWeight: "600",
                          fontSize: scaleW(20),
                          marginBottom: scaleW(20),
                          textAlign: team.imageOnLeft ? "right" : "left",
                        }}
                      >
                        {team.name}
                      </ThemedText>
                      <ThemedText
                        lightColor="#5C4033"
                        darkColor="#5C4033"
                        style={{ fontSize: scaleW(18), textAlign: team.imageOnLeft ? "right" : "left", }}
                      >
                        {descriptionParts[0]}
                        <ThemedText
                          type="heading"
                          lightColor="#5C4033"
                          darkColor="#5C4033"
                          style={{ fontSize: scaleW(18), fontWeight: "600" }}
                        >
                          {team.leaderName}
                        </ThemedText>
                        {descriptionParts[1]}
                      </ThemedText>
                    </View>
                {!team.imageOnLeft ? (
                  <View style={{ height: scaleW(100), flex: 1 }}>
                    <Image
                      source={team.image}
                      resizeMode="contain"
                      style={{
                        position: "absolute",
                        width: scaleW(170),
                        height: scaleW(170),
                        bottom: scaleW(-75),
                      }}
                    />
                  </View>
                ) : null}
              </Pressable>
              </Animated.View>
            );
          })}
          <Animated.View entering={FadeInDown.duration(500).delay(380)}>
            <Animated.View style={enterAnimatedStyle}>
              <Pressable
                onPress={handleEnterHuntlyWorld}
                disabled={!selectedName || creating}
                onPressIn={() => { enterScale.value = withSpring(0.96, { damping: 15, stiffness: 400 }); }}
                onPressOut={() => { enterScale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
                style={{
                  alignSelf: "center",
                  width: "100%",
                  maxWidth: scaleW(260),
                  paddingVertical: scaleW(18),
                  borderRadius: scaleW(50),
                  marginTop: scaleW(20),
                  marginBottom: scaleW(40),
                  backgroundColor: selectedName && !creating ? CREAM : "#9CA3AF",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 2,
                  opacity: creating ? 0.8 : 1,
                }}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={HUNTLY_GREEN} />
                ) : (
                  <ThemedText
                    type="heading"
                    lightColor={selectedName ? HUNTLY_GREEN : "#6B7280"}
                    darkColor={selectedName ? HUNTLY_GREEN : "#6B7280"}
                    style={{ fontSize: scaleW(18), fontWeight: "600" }}
                  >
                    Enter Huntly World
                  </ThemedText>
                )}
              </Pressable>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </View>
      </SafeAreaView>
    </>
  );
}
