import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import * as Device from "expo-device";
import { FKButton, FKPageHeader } from "@/components/fieldkit";
import {
  DangerButton,
  DialogCard,
  dialogStyles,
  LinkRow,
  RowGroup,
  RowIcon,
  SectionLabel,
  SwitchRow,
} from "@/components/account/GrownUpRows";
import { FK, FONT, RADIUS } from "@/constants/fieldKit";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { useNavigationReturn } from "@/contexts/NavigationReturnContext";
import {
  type AccountRemovalRequest,
  requestAccountRemoval,
  getPendingRemovalRequest,
  cancelRemovalRequest,
  canCancelRemovalRequest,
  sendAccountRemovalNotification,
} from "@/services/accountRemovalService";
import { getPushEnabled, setPushEnabled } from "@/services/pushNotificationService";
import {
  getLocationPermissionStatus,
  requestLocationPermission,
  openLocationSettings,
} from "@/services/locationService";
import {
  getExploreSafetySkipEveryTime,
  setExploreSafetySkipEveryTime,
} from "@/services/exploreSafetyPreference";

type LocationStatus = "granted" | "denied" | "undetermined" | "loading";

/** Grown-up settings: emails, this phone, legal, and account actions at the bottom. */
export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { userData, updateWeeklyEmail, updateGeneralEmail } = useUser();
  const { pushWithReturn } = useNavigationReturn();

  const weeklyEmail = userData?.weekly_email ?? true;
  const generalEmail = userData?.general_email ?? true;
  const [weeklyEmailToggling, setWeeklyEmailToggling] = useState(false);
  const [generalEmailToggling, setGeneralEmailToggling] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [pushNotificationsLoading, setPushNotificationsLoading] = useState(true);
  const [pushNotificationsToggling, setPushNotificationsToggling] = useState(false);
  const [locationPermission, setLocationPermission] = useState<LocationStatus>("loading");
  const [locationToggling, setLocationToggling] = useState(false);
  const [showExploreSafetyEveryTime, setShowExploreSafetyEveryTime] = useState(true);
  const [exploreSafetyLoading, setExploreSafetyLoading] = useState(true);
  const [exploreSafetyToggling, setExploreSafetyToggling] = useState(false);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [removalReason, setRemovalReason] = useState("");
  const [removalSubmitting, setRemovalSubmitting] = useState(false);
  const [pendingRemovalRequest, setPendingRemovalRequest] = useState<AccountRemovalRequest | null>(null);
  const [removalLoading, setRemovalLoading] = useState(false);

  const handleBack = () => (router.canGoBack() ? router.back() : router.navigate("/(tabs)/me"));

  const handleSignOut = () => {
    Alert.alert("Sign out?", "You'll need your email and password to sign back in.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert("Couldn't sign out", "Please try again.");
          }
        },
      },
    ]);
  };

  const refreshPendingRemoval = useCallback(async () => {
    if (!user?.id) return;
    const pending = await getPendingRemovalRequest(user.id);
    setPendingRemovalRequest(pending ?? null);
  }, [user?.id]);

  useEffect(() => {
    void refreshPendingRemoval();
  }, [refreshPendingRemoval]);

  useEffect(() => {
    if (!user?.id) {
      setPushNotificationsLoading(false);
      return;
    }
    void getPushEnabled().then((enabled) => {
      setPushNotifications(enabled);
      setPushNotificationsLoading(false);
    });
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    void getExploreSafetySkipEveryTime().then((skip) => {
      if (cancelled) return;
      setShowExploreSafetyEveryTime(!skip);
      setExploreSafetyLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-read location on focus, so coming back from the phone's Settings app shows the new state.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      void getLocationPermissionStatus().then(setLocationPermission);
    }, [])
  );

  const handleWeeklyEmail = async () => {
    if (weeklyEmailToggling) return;
    setWeeklyEmailToggling(true);
    try {
      await updateWeeklyEmail(!weeklyEmail);
    } catch {
      Alert.alert("Couldn't save", "We couldn't update your weekly email setting. Please try again.");
    } finally {
      setWeeklyEmailToggling(false);
    }
  };

  const handleGeneralEmail = async () => {
    if (generalEmailToggling) return;
    setGeneralEmailToggling(true);
    try {
      await updateGeneralEmail(!generalEmail);
    } catch {
      Alert.alert("Couldn't save", "We couldn't update your news email setting. Please try again.");
    } finally {
      setGeneralEmailToggling(false);
    }
  };

  const handleExploreSafetyToggle = async () => {
    if (exploreSafetyToggling || exploreSafetyLoading) return;
    setExploreSafetyToggling(true);
    const nextShow = !showExploreSafetyEveryTime;
    try {
      await setExploreSafetySkipEveryTime(!nextShow);
      setShowExploreSafetyEveryTime(nextShow);
    } catch {
      Alert.alert("Couldn't save", "We couldn't update the Explore safety setting. Please try again.");
    } finally {
      setExploreSafetyToggling(false);
    }
  };

  const handleLocationToggle = async () => {
    if (locationToggling) return;
    // Once granted or permanently denied, only the phone's Settings app can change it.
    if (locationPermission === "granted" || locationPermission === "denied") {
      openLocationSettings();
      return;
    }
    setLocationToggling(true);
    try {
      const result = await requestLocationPermission();
      setLocationPermission(result);
    } finally {
      setLocationToggling(false);
    }
  };

  const handlePushToggle = async () => {
    if (pushNotificationsToggling) return;
    const next = !pushNotifications;
    setPushNotificationsToggling(true);
    try {
      const ok = await setPushEnabled(next);
      if (next && !ok) {
        Alert.alert(
          "Notifications are off",
          "Permission was turned down, or this device can't get notifications (a simulator, for example). You can turn them on later in your phone's Settings."
        );
        setPushNotifications(false);
      } else {
        setPushNotifications(next);
      }
    } finally {
      setPushNotificationsToggling(false);
    }
  };

  const handleOpenRemovalModal = () => {
    if (pendingRemovalRequest) return;
    setShowRemovalModal(true);
  };

  const handleCloseRemovalModal = () => {
    if (removalSubmitting) return;
    setShowRemovalModal(false);
    setRemovalReason("");
  };

  const handleSubmitRemovalRequest = async () => {
    if (!user?.id) return;
    setRemovalSubmitting(true);
    try {
      await requestAccountRemoval(user.id, removalReason);
      setShowRemovalModal(false);
      setRemovalReason("");
      await refreshPendingRemoval();
      sendAccountRemovalNotification(user.email ?? "", "created");
      Alert.alert(
        "Request sent",
        "We'll review it and then delete your account. You can cancel from Settings for the next 24 hours."
      );
    } catch (e) {
      Alert.alert("Couldn't send request", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setRemovalSubmitting(false);
    }
  };

  const handleCancelRemovalRequest = () => {
    Alert.alert("Keep your account?", "This cancels your request to delete your account.", [
      { text: "Not now", style: "cancel" },
      {
        text: "Keep my account",
        onPress: async () => {
          if (!user?.id) return;
          setRemovalLoading(true);
          try {
            await cancelRemovalRequest(user.id);
            setPendingRemovalRequest(null);
            sendAccountRemovalNotification(user.email ?? "", "canceled");
            Alert.alert("Request cancelled", "Your account will stay as it is.");
          } catch (e) {
            Alert.alert("Couldn't cancel", e instanceof Error ? e.message : "Please try again.");
          } finally {
            setRemovalLoading(false);
          }
        },
      },
    ]);
  };

  const removalCancellable = !!pendingRemovalRequest && canCancelRemovalRequest(pendingRemovalRequest);
  const removalRow = !pendingRemovalRequest
    ? { title: "Delete account", sub: "Ask us to remove your account and every explorer's data", onPress: handleOpenRemovalModal }
    : removalCancellable
      ? { title: "Cancel deletion request", sub: "You asked us to delete your account. You can still change your mind.", onPress: handleCancelRemovalRequest }
      : { title: "Deletion requested", sub: "We're processing your request. It can no longer be cancelled.", onPress: undefined };

  const locationSub =
    locationPermission === "granted"
      ? "On. Change this in your phone's Settings."
      : locationPermission === "denied"
        ? "Off. Turn it on in your phone's Settings."
        : "For nearby adventures and Explore outdoors";

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FKPageHeader eyebrow="For grown-ups" title="Settings" onBack={handleBack} />

        <View style={styles.accountCard}>
          <RowIcon name="person-outline" tone="moss" />
          <View style={{ flex: 1 }}>
            <Text style={styles.accountLabel}>Signed in as</Text>
            <Text style={styles.accountEmail} numberOfLines={1}>
              {user?.email ?? "Not signed in"}
            </Text>
          </View>
        </View>

        <SectionLabel>Emails</SectionLabel>
        <RowGroup>
          <SwitchRow
            icon="mail-outline"
            title="New mission emails"
            sub="This week's missions and anything to get ready"
            value={weeklyEmail}
            onChange={() => void handleWeeklyEmail()}
            busy={weeklyEmailToggling}
            testID="settings-weekly-email"
          />
          <SwitchRow
            icon="newspaper-outline"
            title="News from Huntly World"
            sub="New features and seasonal events, now and then"
            value={generalEmail}
            onChange={() => void handleGeneralEmail()}
            busy={generalEmailToggling}
            testID="settings-general-email"
          />
        </RowGroup>

        <SectionLabel>On this phone</SectionLabel>
        <RowGroup>
          <SwitchRow
            icon="notifications-outline"
            title="Notifications"
            sub={Device.isDevice ? "Reminders and new missions on this phone" : "Not available on a simulator"}
            value={pushNotifications}
            onChange={() => void handlePushToggle()}
            busy={pushNotificationsLoading || pushNotificationsToggling}
            testID="settings-push"
          />
          <SwitchRow
            icon="location-outline"
            title="Location"
            sub={locationSub}
            value={locationPermission === "granted"}
            onChange={() => void handleLocationToggle()}
            busy={locationToggling || locationPermission === "loading"}
            testID="settings-location"
          />
          <SwitchRow
            icon="shield-checkmark-outline"
            title="Explore safety reminder"
            sub="Show the outdoor safety rules every time Explore opens"
            value={showExploreSafetyEveryTime}
            onChange={() => void handleExploreSafetyToggle()}
            busy={exploreSafetyLoading || exploreSafetyToggling}
            testID="settings-explore-safety"
          />
        </RowGroup>

        <SectionLabel>Legal</SectionLabel>
        <RowGroup>
          <LinkRow
            icon="document-text-outline"
            title="Privacy policy"
            sub="What we collect and how we keep it safe"
            onPress={() => pushWithReturn("/privacy")}
          />
        </RowGroup>

        <View style={styles.dangerZone}>
          <SectionLabel>Account</SectionLabel>
          <RowGroup>
            <LinkRow icon="log-out-outline" title="Sign out" sub="Sign out on this phone" onPress={handleSignOut} danger chevron={false} />
            <LinkRow
              icon="trash-outline"
              title={removalRow.title}
              sub={removalRow.sub}
              onPress={removalRow.onPress}
              loading={removalLoading}
              disabled={!removalRow.onPress}
              danger
              chevron={false}
              testID="settings-delete-account"
            />
          </RowGroup>
        </View>
      </ScrollView>

      <Modal visible={showRemovalModal} animationType="fade" transparent onRequestClose={handleCloseRemovalModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={dialogStyles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseRemovalModal} accessibilityLabel="Close" />
            <DialogCard>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={dialogStyles.title}>Delete your account?</Text>
                <Text style={dialogStyles.body}>
                  We'll delete your account and everything in it: every explorer, their progress, badges and photos. Once
                  we've done it, it can't be undone.
                </Text>
                <Text style={dialogStyles.body}>
                  You can cancel the request from Settings for 24 hours. After that we'll go ahead.
                </Text>
                <Text style={styles.inputLabel}>Anything you'd like to tell us? (optional)</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Why you're leaving"
                  placeholderTextColor="#8C988F"
                  value={removalReason}
                  onChangeText={setRemovalReason}
                  multiline
                  editable={!removalSubmitting}
                />
                <View style={dialogStyles.actions}>
                  <DangerButton
                    label="Send deletion request"
                    onPress={() => void handleSubmitRemovalRequest()}
                    loading={removalSubmitting}
                  />
                  <FKButton label="Keep my account" variant="link" onPress={handleCloseRemovalModal} disabled={removalSubmitting} />
                </View>
              </ScrollView>
            </DialogCard>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FK.moss },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: FK.paper,
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  accountLabel: { fontFamily: FONT.body, fontSize: 14, color: FK.muted },
  accountEmail: { fontFamily: FONT.display, fontSize: 17, color: FK.ink, marginTop: 2 },
  dangerZone: { marginTop: 18, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#CBD3C2" },
  inputLabel: { fontFamily: FONT.bodyBold, fontSize: 15, color: FK.ink, marginTop: 6, marginBottom: 8 },
  reasonInput: {
    minHeight: 96,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: FK.line,
    backgroundColor: FK.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONT.body,
    fontSize: 16,
    color: FK.ink,
    textAlignVertical: "top",
  },
});
