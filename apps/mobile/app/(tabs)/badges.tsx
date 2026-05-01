import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useFocusEffect } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  Badge,
  BadgeProgressRow,
  getBadgeDisplay,
  getBadgeProgressRows,
} from "@/services/badgeService";
import { BadgeDetailModal } from "@/components/BadgeDetailModal";
import { useLayoutScale } from "@/hooks/useLayoutScale";

export default function BadgesScreen() {
  const { profiles } = usePlayer();
  const params = useLocalSearchParams<{ autoOpenBadgeId?: string; profileId?: string }>();
  const { scaleW, isTablet } = useLayoutScale();
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BadgeProgressRow[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgressRow | null>(null);
  const [autoOpenConsumed, setAutoOpenConsumed] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const load = async () => {
        if (!selectedProfileId) {
          setRows([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        const data = await getBadgeProgressRows(selectedProfileId);
        if (isMounted) {
          setRows(data);
          setLoading(false);
        }
      };
      void load();
      return () => {
        isMounted = false;
      };
    }, [selectedProfileId])
  );

  React.useEffect(() => {
    if (profiles.length === 0) {
      setSelectedProfileId(null);
      return;
    }
    const requestedProfileId =
      typeof params.profileId === "string" ? Number(params.profileId) : NaN;
    if (!Number.isNaN(requestedProfileId) && profiles.some((p) => p.id === requestedProfileId)) {
      setSelectedProfileId(requestedProfileId);
      return;
    }
    setSelectedProfileId((prev) => {
      if (prev != null && profiles.some((p) => p.id === prev)) return prev;
      return profiles[0]?.id ?? null;
    });
  }, [profiles, params.profileId]);

  React.useEffect(() => {
    if (autoOpenConsumed) return;
    const autoOpenId =
      typeof params.autoOpenBadgeId === "string" ? Number(params.autoOpenBadgeId) : NaN;
    if (Number.isNaN(autoOpenId) || rows.length === 0) return;
    const match = rows.find((r) => r.badge_id === autoOpenId);
    if (match) {
      setSelectedBadge(match);
      setAutoOpenConsumed(true);
    }
  }, [params.autoOpenBadgeId, rows, autoOpenConsumed]);

  const orderedGroups = useMemo(() => {
    const grouped = rows.reduce<Record<string, BadgeProgressRow[]>>((acc, row) => {
      const key = row.sort_group || "General";
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});

    const entries = Object.entries(grouped).map(([group, badges]) => {
      const sortedBadges = [...badges].sort((a, b) => {
        if (a.earned !== b.earned) return a.earned ? -1 : 1;
        if (a.progress_percent !== b.progress_percent) {
          return b.progress_percent - a.progress_percent;
        }
        return a.requirement_value - b.requirement_value;
      });
      const totalProgress = badges.reduce((sum, b) => sum + (b.progress_percent || 0), 0);
      const avgProgress = badges.length > 0 ? totalProgress / badges.length : 0;
      return [group, sortedBadges, avgProgress] as const;
    });

    entries.sort((a, b) => {
      const aSpecial = a[0].toLowerCase() === "special";
      const bSpecial = b[0].toLowerCase() === "special";
      if (aSpecial !== bSpecial) return aSpecial ? -1 : 1;
      if (a[2] !== b[2]) return b[2] - a[2];
      return a[0].localeCompare(b[0]);
    });

    return entries;
  }, [rows]);

  const renderBadgeIcon = (badge: BadgeProgressRow) => {
    const iconSize = scaleW(isTablet ? 64 : 44);
    const emojiSize = scaleW(isTablet ? 48 : 36);
    const display = getBadgeDisplay({
      id: badge.badge_id,
      name: badge.name,
      description: badge.description,
      image_url: badge.image_url,
      category: badge.category,
      requirement_type: badge.requirement_type,
      requirement_value: badge.requirement_value,
      requirement_category: badge.requirement_category ?? undefined,
    } as Badge);
    if (display.type === "image") {
      return (
        <Image
          source={{ uri: display.content }}
          style={[styles.badgeImage, { width: iconSize, height: iconSize }]}
        />
      );
    }
    return (
      <ThemedText
        style={[styles.badgeEmoji, { fontSize: emojiSize, lineHeight: emojiSize + scaleW(4) }]}
      >
        {display.content}
      </ThemedText>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            gap: scaleW(12),
            paddingHorizontal: scaleW(isTablet ? 30 : 24),
            paddingTop: scaleW(16),
            paddingBottom: scaleW(40),
            width: "100%",
            maxWidth: isTablet ? scaleW(780) : undefined,
            alignSelf: "center",
          },
        ]}
      >
        <ThemedText type="heading">Badges & Rewards</ThemedText>
        <ThemedText style={styles.subtitle}>
          Complete missions to unlock milestone badges.
        </ThemedText>
        {profiles.length > 0 ? (
          <View style={styles.profileRow}>
            {profiles.map((profile) => (
              <Pressable
                key={profile.id}
                style={[
                  styles.profileChip,
                  {
                    paddingHorizontal: scaleW(10),
                    paddingVertical: scaleW(6),
                    borderRadius: scaleW(999),
                  },
                  selectedProfileId === profile.id ? styles.profileChipActive : undefined,
                ]}
                onPress={() => setSelectedProfileId(profile.id)}
              >
                <ThemedText
                  style={[
                    styles.profileChipText,
                    { fontSize: scaleW(12) },
                    selectedProfileId === profile.id
                      ? styles.profileChipTextActive
                      : undefined,
                  ]}
                >
                  {profile.nickname || profile.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator size="large" color="#4F6F52" style={{ marginTop: 24 }} />
        ) : rows.length === 0 ? (
          <ThemedText style={styles.subtitle}>No badges available yet.</ThemedText>
        ) : (
          orderedGroups.map(([group, badges]) => (
            <View
              key={group}
              style={[
                styles.groupCard,
                {
                  borderRadius: scaleW(16),
                  padding: scaleW(14),
                  gap: scaleW(12),
                },
              ]}
            >
              <View style={styles.groupHeader}>
                <ThemedText type="defaultSemiBold">{group}</ThemedText>
                <ThemedText style={styles.groupMeta}>
                  {badges.filter((b) => b.earned).length}/{badges.length} unlocked
                </ThemedText>
              </View>

              <View style={styles.grid}>
                {badges.map((badge) => (
                  <Pressable
                    key={badge.badge_id}
                    style={[
                      styles.badgeTile,
                      {
                        width: isTablet ? "30%" : "31%",
                        minHeight: scaleW(isTablet ? 164 : 108),
                        borderRadius: scaleW(isTablet ? 16 : 12),
                        padding: scaleW(isTablet ? 12 : 8),
                        gap: scaleW(isTablet ? 6 : 4),
                      },
                      !badge.earned ? styles.badgeTileLocked : undefined,
                    ]}
                    onPress={() => setSelectedBadge(badge)}
                  >
                    {renderBadgeIcon(badge)}
                    <ThemedText
                      style={[
                        styles.badgeName,
                        {
                          fontSize: scaleW(isTablet ? 15 : 12),
                          lineHeight: scaleW(isTablet ? 19 : 16),
                        },
                      ]}
                    >
                      {badge.name}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.badgeProgress,
                        {
                          fontSize: scaleW(isTablet ? 13 : 11),
                          lineHeight: scaleW(isTablet ? 16 : 14),
                        },
                      ]}
                    >
                      {badge.earned
                        ? "Unlocked"
                        : `${Math.round(badge.progress_percent)}%`}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <BadgeDetailModal
        visible={selectedBadge != null}
        badge={
          selectedBadge
            ? ({
                id: selectedBadge.badge_id,
                name: selectedBadge.name,
                description: selectedBadge.description,
                image_url: selectedBadge.image_url,
                category: selectedBadge.category,
                requirement_type: selectedBadge.requirement_type,
                requirement_value: selectedBadge.requirement_value,
                requirement_category: selectedBadge.requirement_category ?? undefined,
                badge_type: selectedBadge.badge_type,
              } as Badge)
            : null
        }
        earnedAt={selectedBadge?.earned_at ?? undefined}
        onClose={() => setSelectedBadge(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F0EB" },
  content: {},
  subtitle: {
    opacity: 0.75,
  },
  groupCard: {
    backgroundColor: "#FFFFFF",
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupMeta: { opacity: 0.65 },
  profileRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  profileChip: {
    borderWidth: 1,
    borderColor: "#A7B0A5",
    backgroundColor: "#FFFFFF",
  },
  profileChipActive: { backgroundColor: "#4F6F52", borderColor: "#4F6F52" },
  profileChipText: { color: "#2B2B2B", fontWeight: "600" },
  profileChipTextActive: { color: "#FFFFFF" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badgeTile: {
    width: "31%",
    backgroundColor: "#F8F5F1",
    alignItems: "center",
  },
  badgeTileLocked: { opacity: 0.35 },
  badgeImage: { width: 44, height: 44 },
  badgeEmoji: { fontSize: 36, lineHeight: 40 },
  badgeName: { textAlign: "center", fontSize: 12, fontWeight: "700" },
  badgeProgress: { fontSize: 11, opacity: 0.65 },
});
