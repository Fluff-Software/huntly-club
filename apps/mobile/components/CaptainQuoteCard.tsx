import React, { useMemo } from "react";
import { View, Image } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { getTeamCardConfig } from "@/utils/teamUtils";

const CAPTAIN_MESSAGES = (leaderName: string) => [
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

type CaptainQuoteCardProps = {
  teamName?: string | null;
};

export function CaptainQuoteCard({ teamName }: CaptainQuoteCardProps) {
  const { scaleW } = useLayoutScale();
  const config = getTeamCardConfig(teamName);
  const message = useMemo(() => {
    const msgs = CAPTAIN_MESSAGES(config.leaderName);
    return msgs[Math.floor(Math.random() * msgs.length)];
  }, [config.leaderName]);

  return (
    <View
      style={{
        backgroundColor: config.backgroundColor,
        borderRadius: scaleW(20),
        borderWidth: 3,
        borderColor: "#FFF",
        padding: scaleW(16),
        flexDirection: "row",
        alignItems: "flex-start",
        gap: scaleW(12),
        transform: [{ rotate: "-0.8deg" }],
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      }}
    >
      <Image
        source={config.characterImage}
        resizeMode="cover"
        style={{
          width: scaleW(52),
          height: scaleW(52),
          borderRadius: scaleW(26),
          borderWidth: 2,
          borderColor: "#FFF",
          backgroundColor: "rgba(255,255,255,0.6)",
        }}
      />
      <View style={{ flex: 1, gap: scaleW(4) }}>
        <ThemedText
          type="heading"
          style={{ fontSize: scaleW(12), fontWeight: "800", color: config.accentColor, letterSpacing: 0.5 }}
        >
          CAPTAIN {config.leaderName.toUpperCase()}
        </ThemedText>
        <ThemedText style={{ fontSize: scaleW(15), lineHeight: scaleW(20), color: "#333", fontStyle: "italic" }}>
          "{message}"
        </ThemedText>
      </View>
    </View>
  );
}
