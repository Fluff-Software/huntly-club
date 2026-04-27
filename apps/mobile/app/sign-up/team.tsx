import React, { useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useSignUp } from "@/contexts/SignUpContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUser } from "@/contexts/UserContext";
import { getTeams, getProfiles, createProfile, updateUserDataTeam } from "@/services/profileService";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { START_MISSION_STEP } from "@/constants/startMissionOnboarding";
import { hasExplorersForTeamStep } from "@/utils/hasExplorersForTeamStep";

const HUNTLY_GREEN = "#4F6F52";
const CREAM = "#F4F0EB";

const HARDCODED_TEAMS = [
  {
    name: "Bears",
    leaderPossessive: "Bella's",
    backgroundColor: "#E8C4B8",
    accentColor: "#A0572A",
    leaderColor: "#C97B30",
    bgImage: require("@/assets/images/bears-bg.png"),
    badgeImage: require("@/assets/images/bears-badge.png"),
    characterImage: require("@/assets/images/bella-close-smiling.png"),
    traits: [
      { icon: "shield" as const, label: "Brave" },
      { icon: "favorite" as const, label: "Kind" },
      { icon: "search" as const, label: "Curious" },
    ] },
  {
    name: "Foxes",
    leaderPossessive: "Felix's",
    backgroundColor: "#B8D4E8",
    accentColor: "#1E4C8A",
    leaderColor: "#2A5FAB",
    bgImage: require("@/assets/images/foxes-bg.png"),
    badgeImage: require("@/assets/images/foxes-badge.png"),
    characterImage: require("@/assets/images/felix-close-smiling.png"),
    traits: [
      { icon: "bolt" as const, label: "Quick" },
      { icon: "edit" as const, label: "Creative" },
      { icon: "lightbulb" as const, label: "Clever" },
    ] },
  {
    name: "Otters",
    leaderPossessive: "Oli's",
    backgroundColor: "#C8D8A8",
    accentColor: "#3A6028",
    leaderColor: "#4A7038",
    bgImage: require("@/assets/images/otters-bg.png"),
    badgeImage: require("@/assets/images/otters-badge.png"),
    characterImage: require("@/assets/images/oli-close-smiling.png"),
    traits: [
      { icon: "sentiment-satisfied" as const, label: "Playful" },
      { icon: "visibility" as const, label: "Observant" },
      { icon: "explore" as const, label: "Adventurous" },
    ] },
];

export default function SignUpTeamScreen() {
  const { scaleW, width } = useLayoutScale();
  const {
    players,
    setSelectedTeamName,
    clearSignUpData,
    setShowPostSignUpWelcome,
    setTutorialStep } = useSignUp();
  const { user } = useAuth();
  const { profiles, loading: profilesLoading, refreshProfiles } = usePlayer();
  const { refreshUserData, updateStartMissionStep } = useUser();
  const [creating, setCreating] = useState(false);

  const goToAddExplorers = () => {
    router.replace("/sign-up/players");
  };

  const hasExplorers = hasExplorersForTeamStep(players, profiles);
  const showProfileLoading = Boolean(user && profilesLoading);
  const showNoExplorers = Boolean(user && !profilesLoading && !hasExplorers);

  const handleEnterHuntlyWorld = async (teamName: string) => {
    if (!user) {
      Alert.alert("Error", "You must be signed in to continue. Please verify your email.");
      return;
    }

    setSelectedTeamName(teamName);
    setCreating(true);

    try {
      const freshProfiles = await getProfiles(user.id);
      if (!hasExplorersForTeamStep(players, freshProfiles)) {
        Alert.alert("Add explorers", "Please go back and add at least one explorer.");
        return;
      }

      const teams = await getTeams();
      const team = teams.find((t) => t.name.toLowerCase() === teamName.toLowerCase());
      const teamId = team?.id ?? teams[0]?.id;
      if (!teams.length || !teamId) {
        Alert.alert(
          "Setup required",
          "Teams could not be loaded. Try resetting the database (e.g. make reset) so migrations run."
        );
        return;
      }

      await updateUserDataTeam(user.id, teamId);
      await refreshUserData();

      for (const player of players) {
        await createProfile({
          user_id: user.id,
          name: player.name,
          colour: player.colour,
          nickname: player.nickname });
      }
      await refreshProfiles();
      clearSignUpData();
      setTutorialStep("done");
      setShowPostSignUpWelcome(false);
      await updateStartMissionStep(START_MISSION_STEP.WELCOME);
      router.replace("/onboarding/welcome");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create profiles.";
      Alert.alert("Error", message);
    } finally {
      setCreating(false);
    }
  };

  const handleChooseTeam = (teamName: string) => {
    Alert.alert(
      `Continue with ${teamName}?`,
      undefined,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: () => handleEnterHuntlyWorld(teamName) },
      ]
    );
  };

  if (showProfileLoading) {
    return (
      <>
        <StatusBar style="light" />
        <Stack.Screen options={{ title: "Choose your team", headerShown: false }} />
        <SafeAreaView style={{ flex: 1, backgroundColor: HUNTLY_GREEN }} edges={["top", "left", "right"]}>
          <View style={{ flex: 1, paddingHorizontal: scaleW(24), paddingTop: scaleW(8) }}>
            <Pressable
              onPress={goToAddExplorers}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Back to add explorers"
              style={styles.backRow}
            >
              <MaterialIcons name="arrow-back" size={scaleW(28)} color="#FFFFFF" />
            </Pressable>
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color={CREAM} />
              <ThemedText
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                style={{ marginTop: scaleW(16), fontSize: scaleW(16), textAlign: "center" }}
              >
                Loading your explorers…
              </ThemedText>
            </View>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (showNoExplorers) {
    return (
      <>
        <StatusBar style="light" />
        <Stack.Screen options={{ title: "Choose your team", headerShown: false }} />
        <SafeAreaView style={{ flex: 1, backgroundColor: HUNTLY_GREEN }} edges={["top", "left", "right"]}>
          <View style={{ flex: 1, paddingHorizontal: scaleW(24), paddingTop: scaleW(8) }}>
            <Pressable
              onPress={goToAddExplorers}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Back to add explorers"
              style={styles.backRow}
            >
              <MaterialIcons name="arrow-back" size={scaleW(28)} color="#FFFFFF" />
            </Pressable>
            <View style={styles.emptyCenter}>
              <ThemedText
                type="heading"
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                style={{ fontSize: scaleW(22), fontWeight: "600", textAlign: "center", marginBottom: scaleW(12) }}
              >
                Add an explorer first
              </ThemedText>
              <ThemedText
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                style={{ fontSize: scaleW(16), textAlign: "center", lineHeight: scaleW(24), opacity: 0.95, marginBottom: scaleW(28) }}
              >
                You need at least one explorer before you can choose a team. Add one now, then come back to continue.
              </ThemedText>
              <Pressable
                onPress={goToAddExplorers}
                style={{
                  backgroundColor: CREAM,
                  paddingVertical: scaleW(16),
                  paddingHorizontal: scaleW(32),
                  borderRadius: scaleW(50),
                  alignSelf: "center",
                  minWidth: scaleW(220),
                  alignItems: "center" }}
              >
                <ThemedText
                  type="heading"
                  lightColor={HUNTLY_GREEN}
                  darkColor={HUNTLY_GREEN}
                  style={{ fontSize: scaleW(18), fontWeight: "600" }}
                >
                  Add explorers
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </>
    );
  }

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
            paddingVertical: scaleW(24) }}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={goToAddExplorers}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back to add explorers"
            style={[styles.backRow, { marginBottom: scaleW(16) }]}
          >
            <MaterialIcons name="arrow-back" size={scaleW(28)} color="#FFFFFF" />
          </Pressable>
          <Animated.View>
            <ThemedText
              type="heading"
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                textAlign: "center",
                fontWeight: "600",
                fontSize: scaleW(24) }}
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
                lineHeight: scaleW(24) }}
            >
              Pick the team that feels most like you.
            </ThemedText>
          </Animated.View>

          {HARDCODED_TEAMS.map((team) => {
            return (
              <View key={team.name}>
                <Pressable
                  onPress={() => handleChooseTeam(team.name)}
                  style={{
                    backgroundColor: team.backgroundColor,
                    borderRadius: scaleW(20),
                    marginBottom: scaleW(16),
                    overflow: "hidden",
                    minHeight: scaleW(190) }}
                >
                  {/* Background scene image — left-anchored, full height */}
                  <Image
                    source={team.bgImage}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 'auto',
                      height: '100%' }}
                  />

                  {/* Character image — absolute to card, pinned bottom-right */}
                  <Image
                    source={team.characterImage}
                    resizeMode="contain"
                    style={{
                      position: "absolute",
                      bottom: -40,
                      right: 0,
                      width: scaleW(160),
                      height: scaleW(210) }}
                  />

                  {/* Left column content — right margin keeps text clear of character */}
                  <View style={{ padding: scaleW(16), marginRight: scaleW(130), justifyContent: "space-between", flex: 1 }}>
                    {/* Badge + team name */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: scaleW(12) }}>
                      <Image
                        source={team.badgeImage}
                        style={{
                          width: scaleW(60),
                          height: scaleW(60) }}
                        resizeMode="contain"
                      />
                      <View>
                        <ThemedText
                          type="heading"
                          lightColor={team.accentColor}
                          darkColor={team.accentColor}
                          style={{ fontWeight: "700", fontSize: scaleW(26), lineHeight: scaleW(30) }}
                        >
                          {team.name}
                        </ThemedText>
                        <ThemedText
                          lightColor={team.leaderColor}
                          darkColor={team.leaderColor}
                          style={{ fontSize: scaleW(14), fontWeight: "600" }}
                        >
                          {team.leaderPossessive} team
                        </ThemedText>
                      </View>
                    </View>

                    {/* Trait chips */}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: scaleW(6), marginTop: scaleW(12) }}>
                      {team.traits.map((trait) => (
                        <View
                          key={trait.label}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "rgba(255,255,255,0.65)",
                            borderRadius: scaleW(20),
                            paddingHorizontal: scaleW(10),
                            paddingVertical: scaleW(4),
                            gap: scaleW(4) }}
                        >
                          <MaterialIcons name={trait.icon} size={scaleW(14)} color={team.accentColor} />
                          <ThemedText
                            lightColor={team.accentColor}
                            darkColor={team.accentColor}
                            style={{ fontSize: scaleW(13), fontWeight: "600" }}
                          >
                            {trait.label}
                          </ThemedText>
                        </View>
                      ))}
                    </View>

                    {/* Choose button */}
                    <Pressable
                      onPress={() => handleChooseTeam(team.name)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: team.accentColor,
                        borderRadius: scaleW(50),
                        paddingVertical: scaleW(10),
                        paddingHorizontal: scaleW(16),
                        marginTop: scaleW(14),
                        alignSelf: "flex-start" }}
                    >
                      <ThemedText
                        type="heading"
                        lightColor="#FFFFFF"
                        darkColor="#FFFFFF"
                        style={{ fontSize: scaleW(15), fontWeight: "700" }}
                      >
                        Choose {team.name}
                      </ThemedText>
                      <MaterialIcons name="chevron-right" size={scaleW(18)} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  backRow: {
    alignSelf: "flex-start",
    paddingVertical: 4 },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 48 },
  emptyCenter: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 48 } });
