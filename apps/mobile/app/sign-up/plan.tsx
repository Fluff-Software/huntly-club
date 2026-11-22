import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { FKButton, FKEyebrow, FKProgressHeader, FKScreen } from "@/components/fieldkit";
import { SlotPicker } from "@/components/onboarding/SlotPicker";
import { FK, TYPE } from "@/constants/fieldKit";
import { ONBOARDING_STEPS } from "@/constants/onboarding";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useSignUp } from "@/contexts/SignUpContext";
import type { AdventurePlanDraft } from "@/services/adventurePlanService";
import { familySentence } from "@/utils/familyNames";

const EMPTY: AdventurePlanDraft = { choice: "skipped", firstAt: null, weeklyDays: [], weeklyTime: null };

/**
 * Step 4: intention setting. Addressed to the parent. A stated plan with a time
 * attached is far more likely to happen than "we'll try it at some point".
 */
export default function SignUpPlanScreen() {
  const { players, adventurePlan, setAdventurePlan } = useSignUp();
  const { profiles } = usePlayer();
  const { user } = useAuth();
  const [draft, setDraft] = useState<AdventurePlanDraft>(adventurePlan ?? EMPTY);

  const names = (players.length ? players.map((p) => p.name) : profiles.map((p) => p.name)).filter(Boolean);
  const who = familySentence(names);
  const hasChoice = draft.choice !== "skipped";

  const next = (plan: AdventurePlanDraft) => {
    setAdventurePlan(plan);
    // Families who already have an account (e.g. finishing setup later) skip straight to the end.
    router.push(user ? "/sign-up/finish" : "/sign-up");
  };

  const handleBack = () => (router.canGoBack() ? router.back() : router.replace("/sign-up/guide"));

  return (
    <FKScreen
      footer={
        <>
          <FKButton label="Continue" variant="ink" onPress={() => next(draft)} disabled={!hasChoice} testID="plan-continue" />
          <FKButton
            label="Skip for now"
            variant="link"
            onPress={() => next({ ...EMPTY, weeklyDays: draft.weeklyDays, weeklyTime: draft.weeklyTime })}
            testID="plan-skip"
          />
        </>
      }
    >
      <StatusBar style="dark" />
      <FKProgressHeader step={4} total={ONBOARDING_STEPS} onBack={handleBack} />
      <FKEyebrow style={{ marginBottom: 6 }}>FOR GROWN-UPS</FKEyebrow>
      <Text style={TYPE.title}>
        When will {who} have their first adventure?
      </Text>
      <Text style={[TYPE.bodySmall, styles.lead]}>Pick a moment that suits you. We'll remind you, and you can change it any time.</Text>
      <SlotPicker value={draft} onChange={setDraft} />
      <Text style={styles.note}>One nudge at these times, never between 8pm and 7am.</Text>
    </FKScreen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: 8, marginBottom: 18, fontSize: 16, lineHeight: 22 },
  note: { ...TYPE.bodySmall, marginTop: 14, color: FK.muted },
});
