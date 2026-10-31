import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { FKButton, FKEyebrow, FKScreen } from "@/components/fieldkit";
import { SecretMessage } from "@/components/onboarding/SecretMessage";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { guideForTeamName } from "@/constants/guides";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useSignUp } from "@/contexts/SignUpContext";
import { useUser } from "@/contexts/UserContext";
import {
  type AdventurePlan,
  defaultSkippedSlot,
  friendlyWhen,
  getAdventurePlan,
  shortWeekday,
} from "@/services/adventurePlanService";
import { requestReminderPermission, syncAdventureReminders } from "@/services/adventureReminderService";
import { completeOnboarding } from "@/services/onboardingService";
import { setSecretMessagePending } from "@/services/secretMessageService";

type Phase = "saving" | "error" | "remind" | "secret";

/**
 * After the account exists: save team, explorers and plan; confirm the slot and
 * ask for reminder permission (with the reason, at the moment of booking); then
 * hand the phone to the child for their guide's secret message.
 */
export default function SignUpFinishScreen() {
  const { user } = useAuth();
  const { players, selectedTeamName, adventurePlan, clearSignUpData, draftLoaded } = useSignUp();
  const { refreshProfiles } = usePlayer();
  const { refreshUserData, team } = useUser();
  const [phase, setPhase] = useState<Phase>("saving");
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<AdventurePlan | null>(null);
  const [childName, setChildName] = useState<string | null>(players[0]?.name ?? null);
  const [asking, setAsking] = useState(false);
  const startedRef = useRef(false);
  const teamName = selectedTeamName ?? team?.name ?? null;
  const guide = guideForTeamName(teamName);

  const run = useCallback(async () => {
    if (!user || !teamName) return;
    setPhase("saving");
    setError(null);
    try {
      const result = await completeOnboarding({ userId: user.id, players, teamName, plan: adventurePlan });
      // On a remount the draft has already been cleared; fall back to the saved plan.
      setPlan(result.plan ?? (await getAdventurePlan(user.id)));
      setChildName(result.firstExplorerName);
      await Promise.all([refreshProfiles(), refreshUserData()]);
      clearSignUpData();
      setPhase("remind");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong saving your setup.");
      setPhase("error");
    }
  }, [user, teamName, players, adventurePlan, refreshProfiles, refreshUserData, clearSignUpData]);

  useEffect(() => {
    if (!draftLoaded || startedRef.current) return;
    if (!user) return;
    if (!teamName) {
      // Nothing to finish (e.g. opened directly): pick up where they left off.
      router.replace(players.length ? "/sign-up/team" : "/sign-up/players");
      return;
    }
    startedRef.current = true;
    void run();
  }, [draftLoaded, user, teamName, players.length, run]);

  const goHome = () => router.replace("/(tabs)");

  const handleRemind = async () => {
    setAsking(true);
    try {
      const granted = await requestReminderPermission();
      if (granted) await syncAdventureReminders(plan, guide.guideName);
    } finally {
      setAsking(false);
      setPhase("secret");
    }
  };

  if (phase === "secret") {
    const evening = new Date().getHours() >= 19 || new Date().getHours() < 5;
    return (
      <>
        <Stack.Screen options={{ gestureEnabled: false }} />
        <SecretMessage
          guide={guide}
          childName={childName}
          onDone={() => {
            void setSecretMessagePending(false);
            goHome();
          }}
          onSaveForLater={
            evening
              ? () => {
                  void setSecretMessagePending(true);
                  goHome();
                }
              : undefined
          }
        />
      </>
    );
  }

  if (phase === "saving" || phase === "error") {
    return (
      <FKScreen dark scroll={false} contentStyle={styles.center}>
        <Stack.Screen options={{ gestureEnabled: false }} />
        <StatusBar style="light" />
        {phase === "saving" ? (
          <>
            <ActivityIndicator size="large" color={FK.sunbeam} />
            <Text style={styles.savingText}>Setting up the {guide.teamName} den…</Text>
          </>
        ) : (
          <>
            <Ionicons name="cloud-offline-outline" size={48} color={FK.sunbeam} />
            <Text style={styles.savingText}>{error}</Text>
            <FKButton label="Try again" onPress={() => void run()} style={{ marginTop: 24, alignSelf: "stretch" }} />
          </>
        )}
      </FKScreen>
    );
  }

  // phase === "remind"
  const skipped = !plan?.firstAt || plan.choice === "skipped";
  const when = skipped ? defaultSkippedSlot() : new Date(plan!.firstAt!);
  const headline = skipped
    ? `${guide.teamName} are ready when you are`
    : `${guide.teamName} head out ${friendlyWhen(when)}`;
  const weekly =
    plan?.weeklyDays.length && plan.weeklyTime
      ? `Then every ${plan.weeklyDays.map(shortWeekday).join(", ")} at ${plan.weeklyTime}`
      : null;

  return (
    <FKScreen
      footer={
        <>
          <FKButton label="Remind me" icon="notifications" onPress={handleRemind} loading={asking} testID="finish-remind" />
          <FKButton label="No reminders, thanks" variant="link" onPress={() => setPhase("secret")} testID="finish-no-remind" />
        </>
      }
    >
      <Stack.Screen options={{ gestureEnabled: false }} />
      <StatusBar style="dark" />
      <Animated.View entering={ZoomIn.duration(450)} style={[styles.badgeWrap, { backgroundColor: guide.colour }]}>
        <Image source={guide.badge} style={styles.badge} contentFit="contain" />
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(400).delay(150)}>
        <FKEyebrow style={{ textAlign: "center", marginTop: 18 }}>YOU'RE BOOKED IN</FKEyebrow>
        <Text style={[TYPE.title, { textAlign: "center", marginTop: 6 }]}>{headline}</Text>
        {weekly ? <Text style={[TYPE.bodySmall, { textAlign: "center", marginTop: 8 }]}>{weekly}</Text> : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.card}>
        <View style={styles.cardIcon}>
          <Ionicons name="notifications-outline" size={24} color={FK.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Want a nudge {skipped ? "at the weekend" : "on the day"}?</Text>
          <Text style={styles.cardText}>
            We'll send one reminder to this phone{skipped ? " on Saturday morning" : ` ${friendlyWhen(when)}`}. Never
            between 8pm and 7am, and never more than a few a week.
          </Text>
        </View>
      </Animated.View>
      <View style={styles.preview}>
        <Text style={styles.previewApp}>HUNTLY WORLD · now</Text>
        <Text style={styles.previewTitle}>Adventure time</Text>
        <Text style={styles.previewBody}>{guide.guideName}'s ready when you are. Your next mission is waiting.</Text>
      </View>
      <Text style={[TYPE.bodySmall, { textAlign: "center", marginTop: 10 }]}>
        Reminders never show your child's name. Change them any time in Settings.
      </Text>
    </FKScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  savingText: { fontFamily: FONT.displayBold, fontSize: 19, color: FK.white, marginTop: 18, textAlign: "center" },
  badgeWrap: {
    alignSelf: "center",
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  badge: { width: 92, height: 92 },
  card: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: FK.paper,
    borderRadius: RADIUS.lg,
    padding: 18,
    marginTop: 26,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: FK.sunbeam,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontFamily: FONT.display, fontSize: 18, color: FK.ink },
  cardText: { fontFamily: FONT.body, fontSize: 15, lineHeight: 21, color: FK.muted, marginTop: 4 },
  preview: {
    backgroundColor: "rgba(16,37,27,0.06)",
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
  },
  previewApp: { fontFamily: FONT.bodyBold, fontSize: 12, color: FK.muted, letterSpacing: 0.6 },
  previewTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: FK.ink, marginTop: 4 },
  previewBody: { fontFamily: FONT.body, fontSize: 15, color: FK.ink, marginTop: 2 },
});
