import React, { useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  Image,
  useWindowDimensions,
} from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ThemedText } from "@/components/ThemedText";
import { useSignUp } from "@/contexts/SignUpContext";

const HUNTLY_GREEN = "#4F6F52";
const CREAM = "#F4F0EB";

/** Reference design size (logical pts). */
const REFERENCE_WIDTH = 390;
const REFERENCE_HEIGHT = 844;

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
  const { width, height } = useWindowDimensions();
  const { setSelectedTeamName } = useSignUp();
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const scaleW = (n: number) => Math.round((width / REFERENCE_WIDTH) * n);
  const scaleH = (n: number) => Math.round((height / REFERENCE_HEIGHT) * n);

  const handleEnterHuntlyWorld = () => {
    if (!selectedName) return;
    setSelectedTeamName(selectedName);
    router.replace({ pathname: "/auth", params: { mode: "signup" } });
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
            disabled={!selectedName}
            style={{
              alignSelf: "center",
              width: "100%",
              maxWidth: scaleW(240),
              paddingVertical: scaleH(18),
              borderRadius: scaleW(50),
              marginTop: scaleH(20),
              backgroundColor: selectedName ? CREAM : "#9CA3AF",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <ThemedText
              type="heading"
              lightColor={selectedName ? HUNTLY_GREEN : "#6B7280"}
              darkColor={selectedName ? HUNTLY_GREEN : "#6B7280"}
              style={{ fontSize: scaleW(18), fontWeight: "600" }}
            >
              Enter Huntly World
            </ThemedText>
          </Pressable>
        </ScrollView>
      </View>
    </>
  );
}
