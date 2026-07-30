/**
 * Safety gate shown when opening Explore — similar intent to Pokémon GO’s
 * “be aware of your surroundings” warning, framed for Huntly families.
 *
 * Rendered as an in-screen overlay (not RN Modal) so it cannot outlive the
 * Explore route when switching tabs.
 */
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const HUNTLY_GREEN = "#4F6F52";
const ACCENT = "#B8F000";

const SAFETY_POINTS = [
  {
    icon: "visibility" as const,
    text: "Always look up from your phone and watch where you’re going.",
  },
  {
    icon: "traffic" as const,
    text: "Stay on pavements and paths. Never cross roads without looking both ways.",
  },
  {
    icon: "directions-car" as const,
    text: "Do not use Explore while riding a bike in traffic or in a moving vehicle.",
  },
  {
    icon: "family-restroom" as const,
    text: "Explore with a parent or trusted adult nearby.",
  },
  {
    icon: "place" as const,
    text: "Only visit places you’re allowed to go — respect private property.",
  },
] as const;

type Props = {
  visible: boolean;
  onAccept: () => void;
  onCancel: () => void;
};

export function ExploreSafetyWarning({ visible, onAccept, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const { scaleW } = useLayoutScale();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          ...StyleSheet.absoluteFillObject,
          zIndex: 100,
          elevation: 100,
          backgroundColor: "rgba(6,12,8,0.92)",
          justifyContent: "center",
          paddingHorizontal: scaleW(20),
          paddingTop: insets.top + scaleW(16),
          paddingBottom: insets.bottom + scaleW(16),
        },
        card: {
          backgroundColor: "#122018",
          borderRadius: scaleW(22),
          borderWidth: 1,
          borderColor: "rgba(184,240,0,0.28)",
          paddingHorizontal: scaleW(20),
          paddingTop: scaleW(22),
          paddingBottom: scaleW(18),
          gap: scaleW(16),
          maxWidth: 440,
          width: "100%",
          alignSelf: "center",
        },
        badge: {
          alignSelf: "center",
          width: scaleW(56),
          height: scaleW(56),
          borderRadius: scaleW(28),
          backgroundColor: "rgba(184,240,0,0.14)",
          borderWidth: 1,
          borderColor: "rgba(184,240,0,0.4)",
          alignItems: "center",
          justifyContent: "center",
        },
        title: {
          textAlign: "center",
          fontSize: scaleW(22),
          lineHeight: scaleW(28),
          fontWeight: "800",
          color: "#FFF",
        },
        subtitle: {
          textAlign: "center",
          fontSize: scaleW(14),
          lineHeight: scaleW(20),
          color: "rgba(255,255,255,0.72)",
          marginTop: scaleW(-6),
        },
        list: {
          gap: scaleW(12),
          marginTop: scaleW(4),
        },
        row: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: scaleW(12),
        },
        rowIcon: {
          width: scaleW(34),
          height: scaleW(34),
          borderRadius: scaleW(17),
          backgroundColor: "rgba(79,111,82,0.45)",
          alignItems: "center",
          justifyContent: "center",
          marginTop: scaleW(1),
        },
        rowText: {
          flex: 1,
          fontSize: scaleW(14),
          lineHeight: scaleW(20),
          color: "rgba(255,255,255,0.9)",
          fontWeight: "600",
        },
        actions: {
          gap: scaleW(10),
          marginTop: scaleW(6),
        },
        primary: {
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(14),
          paddingVertical: scaleW(14),
          alignItems: "center",
        },
        primaryText: {
          color: "#FFF",
          fontWeight: "800",
          fontSize: scaleW(15),
        },
        secondary: {
          borderRadius: scaleW(14),
          paddingVertical: scaleW(12),
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.08)",
        },
        secondaryText: {
          color: "rgba(255,255,255,0.75)",
          fontWeight: "700",
          fontSize: scaleW(14),
        },
        finePrint: {
          textAlign: "center",
          fontSize: scaleW(11),
          lineHeight: scaleW(15),
          color: "rgba(255,255,255,0.45)",
        },
        settingsHint: {
          textAlign: "center",
          fontSize: scaleW(12),
          lineHeight: scaleW(16),
          color: "rgba(255,255,255,0.55)",
          fontWeight: "600",
        },
      }),
    [scaleW, insets.top, insets.bottom]
  );

  if (!visible) return null;

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <View style={styles.card} accessibilityRole="summary">
        <View style={styles.badge}>
          <MaterialIcons name="warning-amber" size={scaleW(30)} color={ACCENT} />
        </View>
        <ThemedText type="heading" lightColor="#FFF" darkColor="#FFF" style={styles.title}>
          Stay safe while exploring
        </ThemedText>
        <ThemedText lightColor="rgba(255,255,255,0.72)" darkColor="rgba(255,255,255,0.72)" style={styles.subtitle}>
          Huntly World Explore is for real outdoor adventures. Read this before you start.
        </ThemedText>

        <View style={styles.list}>
          {SAFETY_POINTS.map((point) => (
            <View key={point.text} style={styles.row}>
              <View style={styles.rowIcon}>
                <MaterialIcons name={point.icon} size={scaleW(18)} color={ACCENT} />
              </View>
              <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.rowText}>
                {point.text}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onAccept}
            style={styles.primary}
            accessibilityRole="button"
            accessibilityLabel="I understand, continue to Explore"
          >
            <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.primaryText}>
              I understand — let’s explore
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={onCancel}
            style={styles.secondary}
            accessibilityRole="button"
            accessibilityLabel="Not now"
          >
            <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.secondaryText}>
              Not now
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText lightColor="rgba(255,255,255,0.45)" darkColor="rgba(255,255,255,0.45)" style={styles.finePrint}>
          You are responsible for your own safety. Follow local laws and your family’s rules.
        </ThemedText>
        <ThemedText lightColor="rgba(255,255,255,0.55)" darkColor="rgba(255,255,255,0.55)" style={styles.settingsHint}>
          Don’t want to see this every time? Turn it off in Settings.
        </ThemedText>
      </View>
    </View>
  );
}
