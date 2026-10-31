import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { FKButton, FKEyebrow, FKProgressHeader, FKScreen } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { guideForTeamName } from "@/constants/guides";
import { ONBOARDING_STEPS } from "@/constants/onboarding";
import { useSignUp } from "@/contexts/SignUpContext";
import { checkEmailAvailable, signUp } from "@/services/authService";
import { friendlyWhen } from "@/services/adventurePlanService";

/** Basic email validation: local@domain.tld */
const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const MIN_PASSWORD_LENGTH = 6;

/**
 * Step 5: the grown-up's account. Asked last, once the family has a team, a
 * guide and a plan worth saving.
 */
export default function SignUpAccountScreen() {
  const { parentEmail, setParentEmail, setPassword, players, selectedTeamName, adventurePlan, hasPendingSetup } =
    useSignUp();
  const [email, setEmail] = useState(parentEmail);
  const [passwordValue, setPasswordValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const guide = guideForTeamName(selectedTeamName);
  const canContinue = isValidEmail(email) && passwordValue.length >= MIN_PASSWORD_LENGTH;
  const names = players.map((p) => p.name);
  const possessive =
    names.length === 1 ? `${names[0]}'s` : names.length === 2 ? `${names[0]} and ${names[1]}'s` : "your explorers'";

  const summary = (() => {
    if (!hasPendingSetup) return null;
    const who = names.length <= 2 ? names.join(" & ") : `${names.length} explorers`;
    const when =
      adventurePlan?.firstAt && adventurePlan.choice !== "skipped"
        ? `First adventure ${friendlyWhen(new Date(adventurePlan.firstAt))}`
        : "First adventure: whenever you're ready";
    return { who, when };
  })();

  const handleContinue = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!canContinue) return;
    setBusy(true);
    try {
      // A failed availability check shouldn't block a family; signUp rejects duplicates anyway.
      const { available } = await checkEmailAvailable(trimmed);
      if (!available) {
        setError("That email already has an account. Sign in instead, or use a different email.");
        return;
      }
      await signUp(trimmed, passwordValue);
      setParentEmail(trimmed);
      setPassword(passwordValue);
      router.push("/sign-up/verify-email");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create your account. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => (router.canGoBack() ? router.back() : router.replace("/sign-up/plan"));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      // Android is edge-to-edge, so adjustResize no longer lifts the footer; pad on both.
      behavior="padding"
    >
      <Stack.Screen options={{ title: "Create account", headerShown: false }} />
      <StatusBar style="dark" />
      {/* Buttons live in the scroll content so the keyboard never covers the fields. */}
      <FKScreen>
        <FKProgressHeader step={5} total={ONBOARDING_STEPS} onBack={handleBack} />
        <FKEyebrow style={{ marginBottom: 6 }}>FOR GROWN-UPS</FKEyebrow>
        <Text style={TYPE.title}>Last step: your grown-up account</Text>
        <Text style={[TYPE.bodySmall, styles.lead]}>
          So {guide.guideName} can save {names.length ? possessive : "your"} progress and send you the reminder.
        </Text>

        {summary ? (
          <View style={[styles.summary, { borderColor: guide.colour }]}>
            <Ionicons name="flag" size={20} color={guide.colour} />
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>
                {summary.who} · {guide.teamName}
              </Text>
              <Text style={styles.summaryText}>{summary.when}</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(null);
          }}
          placeholder="you@example.com"
          placeholderTextColor="#8C988F"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          style={styles.input}
          testID="account-email"
        />
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            ref={passwordRef}
            value={passwordValue}
            onChangeText={(v) => {
              setPasswordValue(v);
              setError(null);
            }}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            placeholderTextColor="#8C988F"
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={canContinue ? handleContinue : undefined}
            style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: "transparent" }]}
            testID="account-password"
          />
          <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10} accessibilityLabel="Show password">
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={FK.muted} />
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.legal}>
          By continuing you agree to our{" "}
          <Text style={styles.legalLink} onPress={() => router.push("/privacy")}>
            privacy policy
          </Text>
          . We'll email you a link to confirm it's really you.
        </Text>
        <FKButton
          label="Save our spot"
          onPress={handleContinue}
          disabled={!canContinue}
          loading={busy}
          testID="account-continue"
          style={{ marginTop: 24 }}
        />
        <FKButton
          label="I already have an account"
          variant="link"
          onPress={() => router.replace({ pathname: "/auth", params: { mode: "login" } })}
        />
      </FKScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: 8, marginBottom: 18, fontSize: 16, lineHeight: 22 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: FK.paper,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    padding: 14,
    marginBottom: 20,
  },
  summaryTitle: { fontFamily: FONT.display, fontSize: 16, color: FK.ink },
  summaryText: { fontFamily: FONT.body, fontSize: 15, color: FK.muted, marginTop: 2 },
  label: { fontFamily: FONT.displayBold, fontSize: 15, color: FK.ink, marginBottom: 6 },
  input: {
    backgroundColor: FK.paper,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: FONT.body,
    fontSize: 17,
    color: FK.ink,
    marginBottom: 16,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FK.paper,
    borderRadius: RADIUS.md,
    paddingRight: 16,
  },
  error: { fontFamily: FONT.bodyBold, fontSize: 15, color: "#B3261E", marginTop: 12 },
  legal: { ...TYPE.bodySmall, marginTop: 16 },
  legalLink: { textDecorationLine: "underline", color: FK.ink },
});
