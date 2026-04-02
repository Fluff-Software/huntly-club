import React, { useState } from "react";
import { View, TextInput, StyleSheet, Alert, Platform, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui/Button";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { submitFeedback } from "../../services/feedbackService";

const TESTING_IMAGE = require("@/assets/images/testing.png");

export default function TestingScreen() {
  const { scaleW, width, isTablet } = useLayoutScale();
  const { profiles } = usePlayer();
  const { teamId } = useUser();
  const { user } = useAuth();

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const profileId = profiles.length > 0 ? profiles[0]?.id ?? null : null;

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitFeedback({
        message: trimmed,
        screen: "testing_tab",
        profileId: profileId ?? undefined,
        teamId: teamId ?? undefined,
        userId: user?.id ?? undefined,
      });
      if (!result.ok) {
        Alert.alert(
          "Couldn’t send feedback",
          "Please try again in a moment."
        );
        return;
      }
      setMessage("");
      Alert.alert("Thank you!", "Your feedback has been sent.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View
        style={[
          styles.content,
          { paddingHorizontal: scaleW(24), paddingTop: scaleW(2) },
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              maxWidth: isTablet ? Math.min(scaleW(420), width * 0.85) : scaleW(360),
            },
          ]}
        >
          <Image
            source={TESTING_IMAGE}
            style={{
              width: scaleW(160),
              height: scaleW(240),
              marginBottom: scaleW(5),
              alignSelf: "center",
            }}
            resizeMode="contain"
          />

          <ThemedText
            type="heading"
            style={{ fontSize: scaleW(22), marginBottom: scaleW(8), textAlign: "center" }}
          >
            Help us make Huntly World better
          </ThemedText>
          <ThemedText
            style={{
              fontSize: scaleW(15),
              lineHeight: scaleW(22),
              marginBottom: scaleW(16),
              textAlign: "center",
            }}
          >
            Tell us what feels
            great, what&apos;s confusing, or anything that doesn&apos;t quite
            work as expected.
          </ThemedText>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Share your feedback here…"
            multiline
            style={[
              styles.input,
              {
                minHeight: scaleW(120),
                padding: scaleW(12),
              },
            ]}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit
          />

          <View style={{ marginTop: scaleW(16) }}>
            <Button
              variant="secondary"
              disabled={!message.trim() || submitting}
              onPress={handleSubmit}
            >
              {submitting ? "Sending…" : "Submit feedback"}
            </Button>
          </View>

          <ThemedText
            style={{
              fontSize: scaleW(12),
              marginTop: scaleW(12),
              opacity: 0.7,
              textAlign: "center",
            }}
          >
            We collect basic details like your app version, device and team
            alongside your message so we can understand and fix issues.
          </ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F0EB",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    width: "100%",
  },
  input: {
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});

