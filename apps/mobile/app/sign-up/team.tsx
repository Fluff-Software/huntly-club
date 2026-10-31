import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FKButton, FKProgressHeader, FKScreen } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { GUIDES, type Guide } from "@/constants/guides";
import { useSignUp } from "@/contexts/SignUpContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { ONBOARDING_STEPS } from "@/constants/onboarding";

/** Step 2: the child picks a team and guide. Addressed to the child. */
export default function SignUpTeamScreen() {
  const { players, selectedTeamName, setSelectedTeamName } = useSignUp();
  const { profiles } = usePlayer();
  const [selected, setSelected] = useState<string | null>(selectedTeamName);

  const names = (players.length ? players.map((p) => p.name) : profiles.map((p) => p.name)).filter(Boolean);
  const who = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} & ${names[1]}` : names.length > 2 ? "Explorers" : "Explorer";

  const choose = (g: Guide) => {
    void Haptics.selectionAsync().catch(() => undefined);
    setSelected(g.teamName);
  };

  const handleContinue = () => {
    if (!selected) return;
    setSelectedTeamName(selected);
    router.push("/sign-up/guide");
  };

  const handleBack = () => (router.canGoBack() ? router.back() : router.replace("/sign-up/players"));

  return (
    <FKScreen footer={<FKButton label="Continue" onPress={handleContinue} disabled={!selected} testID="team-continue" />}>
      <StatusBar style="dark" />
      <FKProgressHeader step={2} total={ONBOARDING_STEPS} onBack={handleBack} />
      <Text style={TYPE.title}>{who}, pick your team!</Text>
      <Text style={[TYPE.bodySmall, styles.lead]}>
        Every mission you finish earns points for your team. Each team has a guide to lead the way.
      </Text>

      {GUIDES.map((g, i) => {
        const isSelected = selected === g.teamName;
        return (
          <Animated.View key={g.team} entering={FadeInDown.duration(350).delay(80 * i)}>
            <Pressable
              onPress={() => choose(g)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              testID={`team-${g.team}`}
              style={[styles.card, isSelected && { borderColor: g.colour, backgroundColor: FK.white }]}
            >
              <View style={[styles.portraitWrap, { backgroundColor: g.colour }]}>
                <Image source={g.portrait} style={styles.portrait} contentFit="cover" contentPosition="top" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.teamName}>{g.teamName}</Text>
                  {isSelected ? <Ionicons name="checkmark-circle" size={26} color={g.colour} /> : null}
                </View>
                <Text style={styles.guide}>with {g.guideName}</Text>
                <Text style={styles.traits}>{g.traits.join(" · ")}</Text>
              </View>
            </Pressable>
          </Animated.View>
        );
      })}
      <Text style={styles.footnote}>Can't decide? There's no wrong answer: every team gets the same missions.</Text>
    </FKScreen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: 10, marginBottom: 20, fontSize: 17, lineHeight: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: FK.paper,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "transparent",
  },
  portraitWrap: { width: 96, height: 96, borderRadius: 22, overflow: "hidden" },
  portrait: { width: "100%", height: "100%" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  teamName: { fontFamily: FONT.display, fontSize: 26, color: FK.ink, letterSpacing: -0.4 },
  guide: { fontFamily: FONT.displayBold, fontSize: 16, color: FK.muted, marginTop: 2 },
  traits: { fontFamily: FONT.body, fontSize: 15, color: FK.muted, marginTop: 6 },
  footnote: { ...TYPE.bodySmall, textAlign: "center", marginTop: 8 },
});
