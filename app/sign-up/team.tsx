import React, { useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ThemedText } from "@/components/ThemedText";
import { useSignUp } from "@/contexts/SignUpContext";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentUser, checkEmailAvailable } from "@/services/authService";
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

export default function SignUpTeamScreen() {
  const { scaleW, scaleH } = useLayoutScale();
  const {
    parentEmail,
    password,
    players,
    setSelectedTeamName,
    clearSignUpData,
  } = useSignUp();
  const { signUp } = useAuth();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleEnterHuntlyWorld = async () => {
    if (!selectedName) return;
    if (!parentEmail.trim() || !password) {
      Alert.alert("Error", "Missing email or password. Please go back and complete the sign-up steps.");
      return;
    }

    setSelectedTeamName(selectedName);
    setCreating(true);

    try {
      const { available, error } = await checkEmailAvailable(parentEmail.trim());
      if (error) {
        Alert.alert("Error", error);
        return;
      }
      if (!available) {
        Alert.alert(
          "Email already in use",
          "This email is already registered. Sign in or use a different email."
        );
        return;
      }

      await signUp(parentEmail.trim(), password);
      const user = await getCurrentUser();
      if (user && players.length > 0) {
        const teams = await getTeams();
        const team = teams.find((t) => t.name.toLowerCase() === selectedName.toLowerCase());
        const teamId = team?.id ?? teams[0]?.id;
        if (teamId) {
          for (const player of players) {
            await createProfile({
              user_id: user.id,
              name: player.name,
              colour: player.colour,
              team: teamId,
              nickname: player.nickname,
            });
          }
        }
      }
      clearSignUpData();

      Alert.alert(
        "Account created",
        "Your account has been created. A confirmation link has been sent to your email—please check it to verify your account.",
        [
          {
            text: "OK",
            onPress: () => router.push("/sign-up/intro"),
          },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create account.";
      Alert.alert("Error", message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ title: "Choose your team", headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: HUNTLY_GREEN }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: scaleW(24),
            paddingTop: scaleH(80),
          }}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText
            type="heading"
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{
              textAlign: "center",
              fontWeight: "600",
              fontSize: scaleW(20),
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
              marginTop: scaleH(8),
              marginBottom: scaleH(32),
            }}
          >
            You'll all explore together as one team.
          </ThemedText>

          {HARDCODED_TEAMS.map((team) => {
            const isSelected = selectedName === team.name;
            const descriptionParts = team.description.split(team.leaderName);

            return (
              <Pressable
                key={team.name}
                onPress={() => setSelectedName(team.name)}
                style={{
                  backgroundColor: team.backgroundColor,
                  borderRadius: scaleW(20),
                  padding: scaleW(20),
                  marginBottom: scaleH(16),
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
                        bottom: -73,
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
                          marginBottom: scaleH(20),
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
                        bottom: -75,
                      }}
                    />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          <Pressable
            onPress={handleEnterHuntlyWorld}
            disabled={!selectedName || creating}
            style={{
              alignSelf: "center",
              width: "100%",
              maxWidth: scaleW(240),
              paddingVertical: scaleH(18),
              borderRadius: scaleW(50),
              marginTop: scaleH(20),
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
        </ScrollView>
      </View>
    </>
  );
}
