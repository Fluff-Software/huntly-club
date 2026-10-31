import React, { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { FKButton, FKProgressHeader, FKScreen } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { useAuth } from "@/contexts/AuthContext";
import { useSignUp, type SignUpPlayer } from "@/contexts/SignUpContext";
import { generateNickname } from "@/services/nicknameGenerator";
import { PROFILE_COLOR_OPTIONS, getTailwindColorHex } from "@/constants/Colors";

import { ONBOARDING_STEPS } from "@/constants/onboarding";
const MAX_EXPLORERS = 6;
const MAX_NAME = 20;

function colourFor(index: number): string {
  // Start with Otter Blue (the previous default) and cycle through the palette.
  const opt = PROFILE_COLOR_OPTIONS[(index + 2) % PROFILE_COLOR_OPTIONS.length];
  return getTailwindColorHex(opt.value);
}

export default function SignUpPlayersScreen() {
  const { players, setAllPlayers, draftLoaded } = useSignUp();
  const { user, signOut } = useAuth();
  const [names, setNames] = useState<string[]>([""]);
  const seededRef = useRef(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  // Restore names from a saved draft once it has loaded.
  useEffect(() => {
    if (!draftLoaded || seededRef.current) return;
    seededRef.current = true;
    if (players.length > 0) setNames(players.map((p) => p.name));
  }, [draftLoaded, players]);

  const cleaned = names.map((n) => n.trim()).filter(Boolean);
  const canContinue = cleaned.length > 0;

  const setName = (i: number, value: string) =>
    setNames((prev) => prev.map((n, idx) => (idx === i ? value.slice(0, MAX_NAME) : n)));

  const addRow = () => {
    if (names.length >= MAX_EXPLORERS) return;
    setNames((prev) => [...prev, ""]);
    setTimeout(() => inputs.current[names.length]?.focus(), 50);
  };

  const removeRow = (i: number) => setNames((prev) => (prev.length === 1 ? [""] : prev.filter((_, idx) => idx !== i)));

  const handleContinue = () => {
    if (!canContinue) return;
    // Reconcile the draft: keep existing nicknames/colours for names that stayed the same.
    const next: SignUpPlayer[] = cleaned.map((name, i) => {
      const existing = players.find((p) => p.name === name);
      return existing ?? { name, nickname: generateNickname(), colour: colourFor(i) };
    });
    setAllPlayers(next);
    router.push("/sign-up/team");
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/auth");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      <FKScreen
        footer={
          <>
            <FKButton label="Continue" onPress={handleContinue} disabled={!canContinue} testID="players-continue" />
            {user ? (
              <FKButton
                label="Log out"
                variant="link"
                onPress={() =>
                  Alert.alert("Log out", "Return to sign in? You can finish setting up later.", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Log out",
                      style: "destructive",
                      onPress: () => void signOut().finally(() => router.replace("/auth")),
                    },
                  ])
                }
              />
            ) : null}
          </>
        }
      >
        <FKProgressHeader step={1} total={ONBOARDING_STEPS} onBack={handleBack} />
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={TYPE.title}>Who's exploring?</Text>
          <Text style={[TYPE.bodySmall, styles.lead]}>
            First names are perfect. Brothers, sisters and cousins can all join, and everyone shares one team.
          </Text>
        </Animated.View>

        {names.map((name, i) => (
          <Animated.View key={i} layout={LinearTransition} entering={FadeInDown.duration(300)} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: colourFor(i) }]}>
              <Text style={styles.dotText}>{(name.trim()[0] ?? "?").toUpperCase()}</Text>
            </View>
            <TextInput
              ref={(r) => {
                inputs.current[i] = r;
              }}
              value={name}
              onChangeText={(v) => setName(i, v)}
              placeholder={i === 0 ? "Explorer's first name" : "Another explorer"}
              placeholderTextColor="#8C988F"
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={canContinue ? handleContinue : undefined}
              testID={`player-name-${i}`}
            />
            {names.length > 1 || name.length > 0 ? (
              <Pressable onPress={() => removeRow(i)} hitSlop={10} accessibilityLabel="Remove explorer">
                <Ionicons name="close-circle" size={26} color="#A4AFA6" />
              </Pressable>
            ) : null}
          </Animated.View>
        ))}

        {names.length < MAX_EXPLORERS ? (
          <Pressable onPress={addRow} style={styles.addRow}>
            <Ionicons name="add" size={22} color={FK.ink} />
            <Text style={styles.addText}>Add another explorer</Text>
          </Pressable>
        ) : null}

        <View style={styles.note}>
          <Ionicons name="shield-checkmark-outline" size={20} color={FK.skyInk} />
          <Text style={styles.noteText}>
            We only ask for a first name. No photos, birthdays or schools, ever.
          </Text>
        </View>
      </FKScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: 10, marginBottom: 22, fontSize: 17, lineHeight: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FK.paper,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 12,
  },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  dotText: { fontFamily: FONT.display, color: FK.white, fontSize: 18 },
  input: { flex: 1, fontFamily: FONT.bodyBold, fontSize: 19, color: FK.ink, paddingVertical: 12 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#C5CFBC",
    paddingVertical: 16,
    marginTop: 4,
  },
  addText: { fontFamily: FONT.displayBold, fontSize: 16, color: FK.ink },
  note: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: FK.sky,
    borderRadius: RADIUS.md,
    padding: 16,
    marginTop: 22,
    alignItems: "flex-start",
  },
  noteText: { flex: 1, fontFamily: FONT.body, fontSize: 15, lineHeight: 21, color: FK.skyInk },
});
