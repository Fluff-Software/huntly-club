import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";

type ButtonVariant = "sunbeam" | "ink" | "paper" | "link";

export function FKButton({
  label,
  onPress,
  variant = "sunbeam",
  icon = "arrow-forward",
  loading,
  disabled,
  style,
  onDark,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap | null;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * The button sits on a dark surface (forest, ink, a photo). Primary buttons
   * are forest green on light screens and cream on dark ones.
   */
  onDark?: boolean;
  testID?: string;
}) {
  const [pressed, setPressed] = React.useState(false);
  const handlePress = () => {
    if (disabled || loading) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onPress();
  };

  if (variant === "link") {
    return (
      <Pressable onPress={handlePress} hitSlop={12} style={[styles.link, style]} testID={testID}>
        <Text style={[styles.linkText, onDark && { color: FK.moss }]}>{label}</Text>
      </Pressable>
    );
  }

  const creamPrimary = variant === "sunbeam" && onDark;
  const bg =
    variant === "sunbeam" ? (onDark ? FK.sunbeam : FK.forest) : variant === "ink" ? FK.ink : FK.paper;
  const fg =
    variant === "sunbeam" ? (onDark ? FK.ink : FK.sunbeam) : variant === "ink" ? FK.sunbeam : FK.ink;
  // Static style (NativeWind's Pressable interop drops function styles), press state tracked manually.
  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled || loading}
      testID={testID}
      accessibilityRole="button"
      style={[
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        creamPrimary && { borderWidth: 1.5, borderColor: FK.sunbeamEdge },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
          {icon ? <Ionicons name={icon} size={22} color={fg} style={{ marginLeft: 10 }} /> : null}
        </>
      )}
    </Pressable>
  );
}

/** Back button + segmented progress, as on the slot picker design. */
export function FKProgressHeader({
  step,
  total,
  onBack,
  dark,
}: {
  step: number;
  total: number;
  onBack?: () => void;
  dark?: boolean;
}) {
  return (
    <View style={styles.progressRow}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={[styles.backButton, dark && { backgroundColor: "rgba(255,255,255,0.12)" }]}
          hitSlop={8}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={dark ? FK.white : FK.ink} />
        </Pressable>
      ) : (
        <View style={{ width: 4 }} />
      )}
      <View style={styles.progressTrack}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSeg,
              {
                backgroundColor: i < step ? (dark ? FK.sunbeam : FK.ink) : dark ? "rgba(255,255,255,0.18)" : "#CDD8C5",
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function FKScreen({
  children,
  footer,
  dark,
  scroll = true,
  contentStyle,
  backgroundColor,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  dark?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}) {
  const bg = backgroundColor ?? (dark ? FK.ink : FK.moss);
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: bg }]} edges={["top", "bottom"]}>
      <Body
        style={{ flex: 1 }}
        {...(scroll
          ? { contentContainerStyle: [styles.content, contentStyle], keyboardShouldPersistTaps: "handled" as const }
          : { style: [{ flex: 1 }, styles.content, contentStyle] })}
      >
        {children}
      </Body>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function FKChip({ label, dark, style }: { label: string; dark?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.chip, dark ? { backgroundColor: "rgba(255,255,255,0.18)" } : null, style]}>
      <Text style={[styles.chipText, dark ? { color: FK.white } : null]}>{label}</Text>
    </View>
  );
}

export function FKEyebrow({ children, color, style }: { children: React.ReactNode; color?: string; style?: object }) {
  return <Text style={[TYPE.eyebrow, color ? { color } : null, style]}>{children}</Text>;
}

/**
 * Calm full-screen loading state: a gently breathing compass on moss. Deliberately
 * team-neutral, so nothing flashes the wrong team's colours before data arrives.
 */
export function FKLoading({ line, dark }: { line?: string; dark?: boolean }) {
  const pulse = useSharedValue(0);
  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [pulse]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.08 }], opacity: 0.55 + pulse.value * 0.45 }));
  return (
    <View style={[styles.loading, { backgroundColor: dark ? FK.ink : FK.moss }]} accessibilityLabel="Loading" accessible>
      <Animated.View style={[styles.loadingRing, dark && { backgroundColor: "rgba(255,255,255,0.08)" }, ring]}>
        <Ionicons name="compass" size={40} color={dark ? FK.sunbeam : FK.forest} />
      </Animated.View>
      {line ? <Text style={[styles.loadingLine, dark && { color: FK.mutedOnDark }]}>{line}</Text> : null}
    </View>
  );
}

/** Soft placeholder block that breathes while content loads. */
export function FKSkeleton({ height, style, dark }: { height: number; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  const pulse = useSharedValue(0);
  React.useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);
  const anim = useAnimatedStyle(() => ({ opacity: 0.5 + pulse.value * 0.5 }));
  return (
    <Animated.View
      style={[{ height, borderRadius: RADIUS.lg, backgroundColor: dark ? "rgba(255,255,255,0.08)" : "#E4E9DC" }, anim, style]}
    />
  );
}

/** Header for sub-screens: round back button, title, optional right-hand action. */
export function FKPageHeader({
  title,
  eyebrow,
  onBack,
  right,
  dark,
}: {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderTop}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={[styles.backButton, dark && { backgroundColor: "rgba(255,255,255,0.12)" }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={24} color={dark ? FK.white : FK.ink} />
          </Pressable>
        ) : (
          <View />
        )}
        {right ?? null}
      </View>
      {eyebrow ? <Text style={[TYPE.eyebrow, { marginTop: 16 }, dark && { color: FK.mutedOnDark }]}>{eyebrow}</Text> : null}
      <Text style={[TYPE.title, { marginTop: eyebrow ? 4 : 16 }, dark && { color: FK.white }]} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

/** Paper card surface used across Field kit screens. */
export function FKCard({
  children,
  style,
  onPress,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
}) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={[styles.card, style]} accessibilityRole="button" testID={testID}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24 },
  footer: { paddingHorizontal: 22, paddingBottom: 12, paddingTop: 8 },
  button: {
    minHeight: 62,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonText: { fontFamily: FONT.display, fontSize: 20, letterSpacing: -0.2 },
  link: { alignSelf: "center", paddingVertical: 12 },
  linkText: {
    fontFamily: FONT.displayBold,
    fontSize: 16,
    color: FK.ink,
    textDecorationLine: "underline",
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 22 },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: FK.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: { flex: 1, flexDirection: "row", gap: 6 },
  progressSeg: { flex: 1, height: 6, borderRadius: 3 },
  chip: {
    backgroundColor: "#E3E8DA",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: { fontFamily: FONT.displayBold, fontSize: 14, color: FK.ink },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: FK.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingLine: { fontFamily: FONT.displayBold, fontSize: 16, color: FK.muted },
  pageHeader: { marginBottom: 18 },
  pageHeaderTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  card: { backgroundColor: FK.paper, borderRadius: RADIUS.lg, padding: 18 },
});
