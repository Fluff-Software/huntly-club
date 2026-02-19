import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { MaterialIcons } from "@expo/vector-icons";
import { BackHeader } from "@/components/BackHeader";
import {
  requestAccountRemoval,
  getPendingRemovalRequest,
  cancelRemovalRequest,
  canCancelRemovalRequest,
  sendAccountRemovalNotification,
} from "@/services/accountRemovalService";

const COLORS = {
  darkGreen: "#4F6F52",
  cream: "#F8F7F4",
  white: "#FFFFFF",
  black: "#000000",
  charcoal: "#333333",
  red: "#FF6666",
};

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const [weeklyEmail, setWeeklyEmail] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [removalReason, setRemovalReason] = useState("");
  const [removalSubmitting, setRemovalSubmitting] = useState(false);
  const [pendingRemovalRequest, setPendingRemovalRequest] = useState<import("@/services/accountRemovalService").AccountRemovalRequest | null>(null);
  const [removalLoading, setRemovalLoading] = useState(false);

  const signOutScale = useSharedValue(1);
  const weeklyEmailScale = useSharedValue(1);
  const pushScale = useSharedValue(1);
  const privacyScale = useSharedValue(1);
  const signOutAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: signOutScale.value }],
  }));
  const weeklyEmailAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: weeklyEmailScale.value }],
  }));
  const pushAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pushScale.value }],
  }));
  const privacyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: privacyScale.value }],
  }));

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert("Error", "Failed to sign out");
          }
        },
      },
    ]);
  };

  const refreshPendingRemoval = async () => {
    if (!user?.id) return;
    const pending = await getPendingRemovalRequest(user.id);
    setPendingRemovalRequest(pending ?? null);
  };

  React.useEffect(() => {
    refreshPendingRemoval();
  }, [user?.id]);

  const handleOpenRemovalModal = () => {
    if (pendingRemovalRequest) return;
    setShowRemovalModal(true);
  };
  const handleCloseRemovalModal = () => {
    if (!removalSubmitting) {
      setShowRemovalModal(false);
      setRemovalReason("");
    }
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
        "Request submitted",
        "Your account removal request has been sent. An admin will review it. You can cancel the request within 24 hours from Settings."
      );
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Failed to submit request"
      );
    } finally {
      setRemovalSubmitting(false);
    }
  };

  const handleCancelRemovalRequest = () => {
    Alert.alert(
      "Cancel account removal",
      "Are you sure you want to cancel your account removal request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, cancel request",
          onPress: async () => {
            if (!user?.id) return;
            setRemovalLoading(true);
            try {
              await cancelRemovalRequest(user.id);
              setPendingRemovalRequest(null);
              sendAccountRemovalNotification(user.email ?? "", "canceled");
              Alert.alert("Request cancelled", "Your account removal request has been cancelled.");
            } catch (e) {
              Alert.alert(
                "Error",
                e instanceof Error ? e.message : "Failed to cancel request"
              );
            } finally {
              setRemovalLoading(false);
            }
          },
        },
      ]
    );
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: COLORS.darkGreen,
        },
        headerBar: {
          backgroundColor: COLORS.darkGreen,
        },
        scrollView: { flex: 1 },
        scrollContent: {
          paddingHorizontal: scaleW(24),
          paddingTop: scaleW(8),
          paddingBottom: scaleW(32),
        },
        sectionTitle: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: COLORS.white,
          marginBottom: scaleW(8),
        },
        email: {
          fontSize: scaleW(15),
          color: COLORS.white,
          marginBottom: scaleW(20),
        },
        signOutButton: {
          width: scaleW(240),
          backgroundColor: COLORS.cream,
          borderRadius: scaleW(48),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(24),
          alignItems: "center",
          justifyContent: "center",
          marginBottom: scaleW(48),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
        },
        signOutText: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: COLORS.darkGreen,
        },
        prefsTitle: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: COLORS.white,
          marginBottom: scaleW(16),
        },
        prefRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: scaleW(14),
        },
        prefLabel: {
          fontSize: scaleW(16),
          color: COLORS.white,
          flex: 1,
        },
        checkbox: {
          width: scaleW(24),
          height: scaleW(24),
          borderRadius: scaleW(6),
          borderWidth: 2,
          borderColor: COLORS.white,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.white,
        },
        privacyButton: {
          width: "100%",
          maxWidth: scaleW(280),
          alignSelf: "center",
          backgroundColor: COLORS.cream,
          borderRadius: scaleW(48),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(24),
          alignItems: "center",
          justifyContent: "center",
          marginTop: scaleW(24),
          marginBottom: scaleW(24),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
        },
        privacyButtonText: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: COLORS.darkGreen,
        },
        removalButton: {
          width: "100%",
          maxWidth: scaleW(280),
          alignSelf: "center",
          backgroundColor: "transparent",
          borderRadius: scaleW(48),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(24),
          alignItems: "center",
          justifyContent: "center",
          marginTop: scaleW(16),
          marginBottom: scaleW(48),
          borderWidth: 2,
          borderColor: COLORS.red,
        },
        removalButtonText: {
          fontSize: scaleW(15),
          fontWeight: "600",
          color: COLORS.red,
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          padding: scaleW(24),
        },
        modalContent: {
          backgroundColor: COLORS.white,
          borderRadius: scaleW(24),
          padding: scaleW(24),
        },
        modalTitle: {
          fontSize: scaleW(20),
          fontWeight: "700",
          color: COLORS.charcoal,
          marginBottom: scaleW(16),
        },
        modalDisclaimer: {
          fontSize: scaleW(14),
          color: COLORS.charcoal,
          marginBottom: scaleW(12),
          lineHeight: scaleW(20),
        },
        modalInputLabel: {
          fontSize: scaleW(15),
          fontWeight: "600",
          color: COLORS.charcoal,
          marginTop: scaleW(8),
          marginBottom: scaleW(8),
        },
        modalInput: {
          minHeight: scaleW(80),
          borderWidth: 2,
          borderColor: COLORS.darkGreen,
          borderRadius: scaleW(12),
          paddingHorizontal: scaleW(16),
          paddingVertical: scaleW(12),
          fontSize: scaleW(16),
          color: COLORS.charcoal,
          backgroundColor: COLORS.cream,
          textAlignVertical: "top",
        },
        modalActions: {
          flexDirection: "row",
          gap: scaleW(12),
          marginTop: scaleW(24),
        },
        modalButton: {
          flex: 1,
          paddingVertical: scaleW(14),
          borderRadius: scaleW(14),
          alignItems: "center",
          justifyContent: "center",
        },
        modalButtonCancel: {
          backgroundColor: COLORS.charcoal,
        },
        modalButtonCancelText: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: COLORS.white,
        },
        modalButtonSubmit: {
          backgroundColor: COLORS.darkGreen,
        },
        modalButtonSubmitText: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: COLORS.white,
        },
      }),
    [scaleW]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={[styles.headerBar, { paddingHorizontal: scaleW(24), paddingBottom: scaleW(8) }]}>
        <BackHeader backToLabel="Back" backTo="/(tabs)/parents" />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <Animated.View entering={FadeInDown.duration(500).delay(0).springify().damping(18)}>
          <ThemedText type="heading" style={styles.sectionTitle}>Your account</ThemedText>
          <ThemedText style={styles.email} numberOfLines={1}>
            {user?.email ?? "parentemail@somewhere.com"}
          </ThemedText>
          <Animated.View style={signOutAnimatedStyle}>
            <Pressable
              style={styles.signOutButton}
              onPress={handleSignOut}
              onPressIn={() => {
                signOutScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                signOutScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
            >
              <ThemedText type="heading" style={styles.signOutText}>Sign Out</ThemedText>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(150).springify().damping(18)}>
          <ThemedText type="heading" style={styles.prefsTitle}>Your preferences</ThemedText>
          <Animated.View style={weeklyEmailAnimatedStyle}>
            <Pressable
              style={styles.prefRow}
              onPress={() => setWeeklyEmail((v) => !v)}
              onPressIn={() => {
                weeklyEmailScale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                weeklyEmailScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
            >
              <ThemedText style={styles.prefLabel}>Receive weekly email</ThemedText>
              <View style={styles.checkbox}>
                {weeklyEmail ? (
                  <MaterialIcons
                    name="check"
                    size={scaleW(18)}
                    color={COLORS.darkGreen}
                  />
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
          <Animated.View style={pushAnimatedStyle}>
            <Pressable
              style={styles.prefRow}
              onPress={() => setPushNotifications((v) => !v)}
              onPressIn={() => {
                pushScale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                pushScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
            >
              <ThemedText style={styles.prefLabel}>
                Receive push notifications
              </ThemedText>
              <View style={styles.checkbox}>
                {pushNotifications ? (
                  <MaterialIcons
                    name="check"
                    size={scaleW(18)}
                    color={COLORS.darkGreen}
                  />
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200).springify().damping(18)}>
          <ThemedText type="heading" style={styles.prefsTitle}>Legal</ThemedText>
          <Animated.View style={privacyAnimatedStyle}>
            <Pressable
              style={styles.privacyButton}
              onPress={() => router.push("/privacy")}
              onPressIn={() => {
                privacyScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                privacyScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
            >
              <ThemedText type="heading" style={styles.privacyButtonText}>
                Privacy Policy
              </ThemedText>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(250).springify().damping(18)}>
          <Pressable
            style={styles.removalButton}
            onPress={pendingRemovalRequest && canCancelRemovalRequest(pendingRemovalRequest) ? handleCancelRemovalRequest : handleOpenRemovalModal}
            disabled={removalLoading || (!!pendingRemovalRequest && !canCancelRemovalRequest(pendingRemovalRequest))}
          >
            {removalLoading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <ThemedText type="heading" style={styles.removalButtonText}>
                {pendingRemovalRequest
                  ? canCancelRemovalRequest(pendingRemovalRequest)
                    ? "Cancel Account Removal"
                    : "Account removal pending"
                  : "Request account removal"}
              </ThemedText>
            )}
          </Pressable>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showRemovalModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseRemovalModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={40}
        >
          <Pressable style={styles.modalOverlay} onPress={handleCloseRemovalModal}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <ThemedText style={styles.modalTitle}>Request account removal</ThemedText>
              <ThemedText style={styles.modalDisclaimer}>
                If your account is removed, all your data will be permanently deleted, including your
                profile(s), progress, achievements, and any uploaded content. This action cannot be
                undone once the request is approved.
              </ThemedText>
              <ThemedText style={styles.modalDisclaimer}>
                You can only cancel your removal request within 24 hours of submitting it. After
                that, the request will be processed by an admin and cannot be cancelled.
              </ThemedText>
              <ThemedText style={styles.modalInputLabel}>Reason for request (optional)</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="Tell us why you're requesting account removal"
                placeholderTextColor="#9CA3AF"
                value={removalReason}
                onChangeText={setRemovalReason}
                multiline
                editable={!removalSubmitting}
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={handleCloseRemovalModal}
                  disabled={removalSubmitting}
                >
                  <ThemedText style={styles.modalButtonCancelText}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonSubmit]}
                  onPress={handleSubmitRemovalRequest}
                  disabled={removalSubmitting}
                >
                  {removalSubmitting ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <ThemedText style={styles.modalButtonSubmitText}>Submit request</ThemedText>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
