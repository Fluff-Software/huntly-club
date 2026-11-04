import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";

/**
 * Field kit rows for the grown-up screens (Explorers & account, Settings).
 * Every row is icon + title + short subtitle + chevron or switch, grouped on paper cards.
 */

type IconName = keyof typeof Ionicons.glyphMap;

/** Muted red for destructive actions; kept local so Field kit tokens stay untouched. */
export const DANGER = "#B4381F";
export const DANGER_SOFT = "#FBE7E1";

export function SectionLabel({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={TYPE.eyebrow}>{children}</Text>
      {right ?? null}
    </View>
  );
}

/** Paper card that holds a group of rows, with hairlines between them. */
export function RowGroup({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, style]}>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <View style={styles.divider} /> : null}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}

export function RowIcon({ name, tone = "sunbeam" }: { name: IconName; tone?: "sunbeam" | "sky" | "danger" | "moss" }) {
  const bg = tone === "sunbeam" ? FK.sunbeam : tone === "sky" ? FK.sky : tone === "danger" ? DANGER_SOFT : FK.moss;
  const fg = tone === "sky" ? FK.skyInk : tone === "danger" ? DANGER : FK.ink;
  return (
    <View style={[styles.icon, { backgroundColor: bg }]}>
      <Ionicons name={name} size={21} color={fg} />
    </View>
  );
}

function RowText({ title, sub, danger }: { title: string; sub?: string | null; danger?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.title, danger && { color: DANGER }]}>{title}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

/** Tappable row that leads somewhere (chevron) or runs an action. */
export function LinkRow({
  icon,
  title,
  sub,
  onPress,
  danger,
  disabled,
  loading,
  chevron = true,
  testID,
}: {
  icon: IconName;
  title: string;
  sub?: string | null;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  chevron?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading || !onPress}
      style={[styles.row, disabled ? { opacity: 0.55 } : null]}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${title}. ${sub}` : title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      testID={testID}
    >
      <RowIcon name={icon} tone={danger ? "danger" : "sunbeam"} />
      <RowText title={title} sub={sub} danger={danger} />
      {loading ? (
        <ActivityIndicator size="small" color={danger ? DANGER : FK.forest} />
      ) : chevron && onPress ? (
        <Ionicons name="chevron-forward" size={20} color={FK.muted} />
      ) : null}
    </Pressable>
  );
}

/** Row with a switch on the right. Shows a spinner instead while loading or saving. */
export function SwitchRow({
  icon,
  title,
  sub,
  value,
  onChange,
  busy,
  disabled,
  testID,
}: {
  icon: IconName;
  title: string;
  sub?: string | null;
  value: boolean;
  onChange: (next: boolean) => void;
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.row} accessible={false}>
      <RowIcon name={icon} tone="sky" />
      <RowText title={title} sub={sub} />
      <View style={styles.switchSlot}>
        {busy ? (
          <ActivityIndicator size="small" color={FK.forest} />
        ) : (
          <Switch
            value={value}
            onValueChange={onChange}
            disabled={disabled}
            trackColor={{ true: FK.forest, false: "#CCD3C4" }}
            thumbColor={FK.white}
            accessibilityLabel={title}
            testID={testID}
          />
        )}
      </View>
    </View>
  );
}

/** Solid destructive button for confirm dialogs. */
export function DangerButton({
  label,
  onPress,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.dangerButton, disabled ? { opacity: 0.5 } : null, style]}
      accessibilityRole="button"
    >
      {loading ? <ActivityIndicator color={FK.white} /> : <Text style={styles.dangerButtonText}>{label}</Text>}
    </Pressable>
  );
}

/** Centred paper sheet on a dimmed backdrop, used for confirmations. */
export function DialogCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.dialog}>{children}</View>;
}

export const dialogStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(16,37,27,0.55)", justifyContent: "center", padding: 22 },
  title: { ...TYPE.heading, marginBottom: 10 },
  body: { ...TYPE.bodySmall, fontSize: 16, lineHeight: 23, color: FK.ink, marginBottom: 12 },
  actions: { gap: 10, marginTop: 14 },
});

const styles = StyleSheet.create({
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 26,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  group: { backgroundColor: FK.paper, borderRadius: RADIUS.lg, paddingHorizontal: 16, paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: FK.line, marginLeft: 58 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, minHeight: 72 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: FONT.display, fontSize: 16, color: FK.ink },
  sub: { fontFamily: FONT.body, fontSize: 14, lineHeight: 19, color: FK.muted, marginTop: 2 },
  switchSlot: { minWidth: 52, alignItems: "flex-end" },
  dangerButton: {
    minHeight: 56,
    borderRadius: RADIUS.pill,
    backgroundColor: DANGER,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  dangerButtonText: { fontFamily: FONT.display, fontSize: 18, color: FK.white },
  dialog: { backgroundColor: FK.paper, borderRadius: RADIUS.lg, padding: 22, maxHeight: "88%" },
});
