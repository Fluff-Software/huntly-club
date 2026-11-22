import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { FKButton, FKEyebrow, FKLoading, FKScreen } from "@/components/fieldkit";
import { SlotPicker } from "@/components/onboarding/SlotPicker";
import { ParentPinModal } from "@/components/ParentPinModal";
import { isParentGateFresh, markParentGatePassed } from "@/services/parentGateSession";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { GUIDES } from "@/constants/guides";
import { useTeamGuide } from "@/hooks/useTeamGuide";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUser } from "@/contexts/UserContext";
import {
  type AdventurePlan,
  type AdventurePlanDraft,
  getAdventurePlan,
  saveAdventurePlan,
  updateAdventurePlanPrefs,
} from "@/services/adventurePlanService";
import {
  getReminderPermission,
  requestReminderPermission,
  syncAdventureReminders,
} from "@/services/adventureReminderService";

const EMPTY: AdventurePlanDraft = { choice: "skipped", firstAt: null, weeklyDays: [], weeklyTime: null };

/**
 * Grown-up settings for the adventure slot and every reminder type, behind the
 * parent gate. Each type can be switched off on its own.
 */
export default function RemindersScreen() {
  const { user } = useAuth();
  const { team } = useUser();
  const { profiles } = usePlayer();
  const { guide: teamGuide } = useTeamGuide();
  const guide = teamGuide ?? GUIDES[0];
  const [unlocked, setUnlocked] = useState(isParentGateFresh);
  // Tab screens stay mounted after you leave them, and a Modal draws over every
  // screen, so the gate must only show while Reminders is the focused screen.
  // Otherwise Cancel navigates away underneath and the gate stays on top.
  const isFocused = useIsFocused();
  // The screen stays mounted between visits, so re-check the gate on every
  // visit rather than once: otherwise one unlock lasts the whole app session.
  useFocusEffect(
    React.useCallback(() => {
      setUnlocked(isParentGateFresh());
    }, [])
  );
  const [plan, setPlan] = useState<AdventurePlan | null>(null);
  const [draft, setDraft] = useState<AdventurePlanDraft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permission, setPermission] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const [savedNote, setSavedNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    void getReminderPermission().then(setPermission);
    void getAdventurePlan(user.id).then((p) => {
      setPlan(p);
      if (p) {
        const firstInFuture = p.firstAt && new Date(p.firstAt).getTime() > Date.now();
        setDraft({
          choice: firstInFuture ? p.choice : "skipped",
          firstAt: firstInFuture ? p.firstAt : null,
          weeklyDays: p.weeklyDays,
          weeklyTime: p.weeklyTime,
        });
      }
      setLoading(false);
    });
  }, [user?.id]);

  const who = profiles.length === 1 ? profiles[0].name : "your explorers";

  const persistPrefs = async (patch: Parameters<typeof updateAdventurePlanPrefs>[1]) => {
    if (!user?.id) return;
    const next = await updateAdventurePlanPrefs(user.id, patch).catch(() => null);
    if (next) {
      setPlan(next);
      await syncAdventureReminders(next, guide.guideName);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      let granted = permission === "granted";
      if (!granted) {
        granted = await requestReminderPermission();
        setPermission(granted ? "granted" : "denied");
      }
      const next = await saveAdventurePlan(user.id, draft);
      setPlan(next);
      const count = granted ? await syncAdventureReminders(next, guide.guideName) : 0;
      setSavedNote(
        granted ? (count > 0 ? "Saved. Reminders are set." : "Saved.") : "Saved. Turn on notifications in Settings to get reminders."
      );
    } catch (e) {
      setSavedNote(e instanceof Error ? e.message : "Couldn't save. Try again?");
    } finally {
      setSaving(false);
    }
  };

  if (!unlocked) {
    return (
      <FKScreen scroll={false} contentStyle={{ flex: 1, justifyContent: "center" }}>
        <StatusBar style="dark" />
        <ParentPinModal
          visible={isFocused}
          onSuccess={() => {
            markParentGatePassed();
            setUnlocked(true);
          }} onCancel={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} />
      </FKScreen>
    );
  }

  if (!teamGuide) return <FKLoading />;

  return (
    <FKScreen
      footer={<FKButton label="Save" icon="checkmark" onPress={handleSave} loading={saving} disabled={loading} testID="reminders-save" />}
    >
      <StatusBar style="dark" />
      <View style={styles.topRow}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          style={styles.back}
          hitSlop={8}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={FK.ink} />
        </Pressable>
      </View>
      <FKEyebrow style={{ marginBottom: 6 }}>FOR GROWN-UPS</FKEyebrow>
      <Text style={TYPE.title}>Adventure time & reminders</Text>
      <Text style={[TYPE.bodySmall, { marginTop: 8, marginBottom: 20, fontSize: 16 }]}>
        When should {who} head out next? We'll nudge this phone, never between 8pm and 7am.
      </Text>

      {loading ? (
        <ActivityIndicator color={FK.forest} />
      ) : (
        <>
          <SlotPicker value={draft} onChange={setDraft} />
          {savedNote ? <Text style={styles.saved}>{savedNote}</Text> : null}

          <Text style={[TYPE.heading, { marginTop: 28, marginBottom: 10 }]}>Reminders</Text>
          {permission === "denied" ? (
            <View style={styles.warn}>
              <Ionicons name="notifications-off-outline" size={20} color={FK.skyInk} />
              <Text style={styles.warnText}>Notifications are off for Huntly World in your phone's Settings.</Text>
            </View>
          ) : null}
          <Toggle
            title="Adventure slot"
            sub="At your booked time, plus a heads-up the evening before morning slots"
            value={plan?.notifyBookedSlot ?? true}
            onChange={(v) => persistPrefs({ notifyBookedSlot: v })}
          />
          <Toggle
            title="New missions"
            sub="The morning a new mission is released"
            value={plan?.notifyNewMission ?? true}
            onChange={(v) => persistPrefs({ notifyNewMission: v })}
          />
          <Toggle
            title="Team moments"
            sub="When your team passes a big milestone"
            value={plan?.notifyTeamMoments ?? false}
            onChange={(v) => persistPrefs({ notifyTeamMoments: v })}
          />
          <Toggle
            title="We miss you"
            sub="One gentle note after 10 quiet days"
            value={plan?.notifyLapsed ?? true}
            onChange={(v) => persistPrefs({ notifyLapsed: v })}
          />
          <Text style={[TYPE.bodySmall, { marginTop: 12 }]}>
            Reminders never show your child's name, photos or where you've been. Quiet hours: 8pm to 7am.
          </Text>
        </>
      )}
    </FKScreen>
  );
}

function Toggle({ title, sub, value, onChange }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: FK.forest, false: "#CCD3C4" }} thumbColor={FK.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", marginBottom: 18 },
  back: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: FK.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  saved: { fontFamily: FONT.bodyBold, fontSize: 15, color: FK.forest, marginTop: 12 },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: FK.paper,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 8,
  },
  toggleTitle: { fontFamily: FONT.display, fontSize: 16, color: FK.ink },
  toggleSub: { fontFamily: FONT.body, fontSize: 14, color: FK.muted, marginTop: 2 },
  warn: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: FK.sky,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
    alignItems: "center",
  },
  warnText: { flex: 1, fontFamily: FONT.body, fontSize: 14, color: FK.skyInk },
});
