import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { BadgeImage } from "@/components/BadgeImage";
import { FKButton } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { Badge, UserBadge } from "@/services/badgeService";
import { prefetchBadgeImage } from "@/utils/badgeImageCache";

interface BadgeDetailModalProps {
  visible: boolean;
  badge: Badge | null;
  earnedAt?: string;
  /** Short progress line for a badge that hasn't been earned yet, e.g. "Mia: 3 of 5 so far". */
  progressText?: string;
  onClose: () => void;
  allBadges?: UserBadge[];
  currentIndex?: number;
  onNext?: () => void;
  onPrev?: () => void;
}

function requirementText(badge: Badge): string {
  const n = badge.requirement_value;
  switch (badge.requirement_type) {
    case "xp_gained":
      return `Earn ${n} XP by doing missions.`;
    case "packs_completed":
      return n > 1 ? `Finish every mission in ${n} chapters.` : "Finish every mission in a chapter.";
    case "activities_completed":
      return `Finish ${n} mission${n > 1 ? "s" : ""}.`;
    case "team_xp":
      return `Help your team reach ${n} XP.`;
    case "team_contribution":
      return `Add ${n} XP to your team yourself.`;
    case "activities_by_category":
      return `Finish ${n} missions of this kind.`;
    default:
      return "Complete the challenge to earn it.";
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const BadgeDetailModal: React.FC<BadgeDetailModalProps> = ({
  visible,
  badge,
  earnedAt,
  progressText,
  onClose,
  allBadges = [],
  currentIndex = 0,
  onNext,
  onPrev,
}) => {
  const spinY = useSharedValue(0);

  React.useEffect(() => {
    if (!visible || !badge) return;
    prefetchBadgeImage(badge);
    if (!earnedAt) return;
    spinY.value = 0;
    spinY.value = withTiming(360, { duration: 900, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, badge?.id, badge?.image_url, earnedAt, spinY]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${spinY.value}deg` }],
  }));

  const handleSpinBadge = React.useCallback(() => {
    const nextFullTurn = Math.ceil(spinY.value / 360) + 1;
    spinY.value = withTiming(nextFullTurn * 360, { duration: 850, easing: Easing.out(Easing.cubic) });
  }, [spinY]);

  if (!badge) return null;

  const earned = !!earnedAt;
  const hasMultipleBadges = allBadges.length > 1;
  const canGoNext = hasMultipleBadges && currentIndex < allBadges.length - 1;
  const canGoPrev = hasMultipleBadges && currentIndex > 0;
  const description =
    badge.requirement_type === "packs_completed" ? requirementText(badge) : badge.description;
  const showHowToEarn = !earned && badge.badge_type !== "manual";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={earned ? [styles.status, { backgroundColor: FK.sunbeam }] : styles.status}>
              <Ionicons name={earned ? "checkmark-circle" : "ellipse-outline"} size={16} color={FK.ink} />
              <Text style={styles.statusText}>{earned ? "Earned" : "Not yet"}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={FK.ink} />
            </Pressable>
          </View>

          {hasMultipleBadges ? (
            <View style={styles.navRow}>
              <Pressable
                onPress={onPrev}
                disabled={!canGoPrev}
                style={canGoPrev ? styles.navButton : [styles.navButton, { opacity: 0.35 }]}
                accessibilityRole="button"
                accessibilityLabel="Previous badge"
              >
                <Ionicons name="chevron-back" size={22} color={FK.ink} />
              </Pressable>
              <Text style={TYPE.bodySmall}>
                {currentIndex + 1} of {allBadges.length}
              </Text>
              <Pressable
                onPress={onNext}
                disabled={!canGoNext}
                style={canGoNext ? styles.navButton : [styles.navButton, { opacity: 0.35 }]}
                accessibilityRole="button"
                accessibilityLabel="Next badge"
              >
                <Ionicons name="chevron-forward" size={22} color={FK.ink} />
              </Pressable>
            </View>
          ) : null}

          <Pressable onPress={handleSpinBadge} style={styles.iconWrap} accessibilityLabel={badge.name}>
            <Animated.View style={[styles.iconCircle, badgeAnimatedStyle]}>
              <View style={earned ? undefined : { opacity: 0.4 }}>
                <BadgeImage badge={badge} size={150} emojiFontSize={72} instant />
              </View>
            </Animated.View>
          </Pressable>

          <Text style={[TYPE.title, styles.center]}>{badge.name}</Text>
          {description ? <Text style={[TYPE.body, styles.center, { marginTop: 6 }]}>{description}</Text> : null}

          {showHowToEarn ? (
            <View style={styles.panel}>
              <Text style={styles.panelLabel}>How to earn it</Text>
              <Text style={styles.panelBody}>{requirementText(badge)}</Text>
              {progressText ? <Text style={[styles.panelBody, { marginTop: 4 }]}>{progressText}</Text> : null}
            </View>
          ) : null}

          {earnedAt ? (
            <View style={styles.panel}>
              <Text style={styles.panelLabel}>Earned on</Text>
              <Text style={styles.panelBody}>{formatDate(earnedAt)}</Text>
            </View>
          ) : null}

          <FKButton label="Done" variant="ink" icon={null} onPress={onClose} style={{ marginTop: 18 }} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(16,37,27,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: { backgroundColor: FK.paper, borderRadius: RADIUS.lg, padding: 20, width: "100%", maxWidth: 400 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E3E8DA",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: { fontFamily: FONT.display, fontSize: 13, color: FK.ink },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: FK.moss,
    alignItems: "center",
    justifyContent: "center",
  },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: FK.moss,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: { alignItems: "center", marginTop: 8, marginBottom: 14 },
  iconCircle: {
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: FK.moss,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { textAlign: "center" },
  panel: { backgroundColor: FK.moss, borderRadius: RADIUS.md, padding: 14, marginTop: 14 },
  panelLabel: { fontFamily: FONT.display, fontSize: 15, color: FK.ink, marginBottom: 2 },
  panelBody: { fontFamily: FONT.body, fontSize: 16, lineHeight: 22, color: FK.ink },
});
