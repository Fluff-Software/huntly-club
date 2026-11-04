import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { FKButton, FKCard, FKEyebrow, FKPageHeader, FKSkeleton } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { usePlayer } from "@/contexts/PlayerContext";
import { Badge, BadgeProgressRow, getBadgeProgressRows } from "@/services/badgeService";
import { BadgeDetailModal } from "@/components/BadgeDetailModal";
import { BadgeImage } from "@/components/BadgeImage";
import { prefetchBadgeImage, prefetchBadgeImages } from "@/utils/badgeImageCache";

const MAX_WIDTH = 720;
const H_PAD = 20;
const GAP = 10;

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.navigate("/(tabs)/me");
};

const isXp = (row: BadgeProgressRow) =>
  row.requirement_type === "xp_gained" || row.requirement_type === "team_xp" || row.requirement_type === "team_contribution";

function progressLabel(row: BadgeProgressRow): string {
  if (row.badge_type === "manual") return "A special badge, given out by Huntly";
  const done = Math.min(row.progress_value ?? 0, row.requirement_value);
  return `${done} of ${row.requirement_value}${isXp(row) ? " XP" : ""}`;
}

export default function BadgesScreen() {
  const { profiles } = usePlayer();
  const params = useLocalSearchParams<{ autoOpenBadgeId?: string; profileId?: string }>();
  const { width } = useWindowDimensions();
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [rowsByProfile, setRowsByProfile] = useState<Record<number, BadgeProgressRow[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgressRow | null>(null);
  const [autoOpenConsumed, setAutoOpenConsumed] = useState(false);

  const profileKey = profiles.map((p) => p.id).join(",");

  // Load every explorer's badges so each one's count shows in the switcher.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      let isMounted = true;
      const load = async () => {
        if (profiles.length === 0) {
          setRowsByProfile({});
          setLoaded(true);
          return;
        }
        const results = await Promise.all(profiles.map((p) => getBadgeProgressRows(p.id)));
        if (!isMounted) return;
        const next: Record<number, BadgeProgressRow[]> = {};
        profiles.forEach((p, i) => {
          next[p.id] = results[i] ?? [];
        });
        setRowsByProfile(next);
        setLoaded(true);
        void prefetchBadgeImages(results.flat().map((row) => ({ image_url: row.image_url })));
      };
      void load();
      return () => {
        isMounted = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileKey])
  );

  React.useEffect(() => {
    if (profiles.length === 0) {
      setSelectedProfileId(null);
      return;
    }
    const requestedProfileId = typeof params.profileId === "string" ? Number(params.profileId) : NaN;
    if (!Number.isNaN(requestedProfileId) && profiles.some((p) => p.id === requestedProfileId)) {
      setSelectedProfileId(requestedProfileId);
      return;
    }
    setSelectedProfileId((prev) => {
      if (prev != null && profiles.some((p) => p.id === prev)) return prev;
      return profiles[0]?.id ?? null;
    });
  }, [profiles, params.profileId]);

  const rows = useMemo(
    () => (selectedProfileId != null ? rowsByProfile[selectedProfileId] ?? [] : []),
    [rowsByProfile, selectedProfileId]
  );

  React.useEffect(() => {
    if (autoOpenConsumed) return;
    const autoOpenId = typeof params.autoOpenBadgeId === "string" ? Number(params.autoOpenBadgeId) : NaN;
    if (Number.isNaN(autoOpenId) || rows.length === 0) return;
    const match = rows.find((r) => r.badge_id === autoOpenId);
    if (match) {
      setSelectedBadge(match);
      setAutoOpenConsumed(true);
    }
  }, [params.autoOpenBadgeId, rows, autoOpenConsumed]);

  const earned = useMemo(
    () =>
      rows
        .filter((r) => r.earned)
        .sort((a, b) => (b.earned_at ?? "").localeCompare(a.earned_at ?? "")),
    [rows]
  );
  const toEarn = useMemo(
    () =>
      rows
        .filter((r) => !r.earned)
        .sort((a, b) => {
          const aManual = a.badge_type === "manual";
          const bManual = b.badge_type === "manual";
          if (aManual !== bManual) return aManual ? 1 : -1;
          if (a.progress_percent !== b.progress_percent) return b.progress_percent - a.progress_percent;
          return a.requirement_value - b.requirement_value;
        }),
    [rows]
  );

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const selectedName = selectedProfile?.name || selectedProfile?.nickname || "Your explorer";

  const contentWidth = Math.min(width, MAX_WIDTH) - H_PAD * 2;
  const columns = contentWidth > 560 ? 5 : 3;
  const tileWidth = Math.floor((contentWidth - GAP * (columns - 1)) / columns);

  const openBadge = (badge: BadgeProgressRow) => {
    prefetchBadgeImage({ image_url: badge.image_url });
    setSelectedBadge(badge);
  };

  const ready = loaded && (profiles.length === 0 || selectedProfileId != null);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FKPageHeader title="Badges" onBack={goBack} />

        {profiles.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcher}>
            {profiles.map((profile) => {
              const active = profile.id === selectedProfileId;
              const name = profile.name || profile.nickname || "Explorer";
              const count = (rowsByProfile[profile.id] ?? []).filter((r) => r.earned).length;
              return (
                <Pressable
                  key={profile.id}
                  onPress={() => setSelectedProfileId(profile.id)}
                  style={active ? [styles.pill, styles.pillActive] : styles.pill}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={loaded ? `${name}, ${count} ${count === 1 ? "badge" : "badges"}` : name}
                >
                  <Text style={active ? [styles.pillText, { color: FK.white }] : styles.pillText}>{name}</Text>
                  {loaded ? (
                    <View style={active ? [styles.pillCount, { backgroundColor: FK.sunbeam }] : styles.pillCount}>
                      <Text style={styles.pillCountText}>{count}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {!ready ? (
          <View style={{ gap: 12 }}>
            <FKSkeleton height={112} />
            <FKSkeleton height={tileWidth + 40} />
            <FKSkeleton height={84} />
            <FKSkeleton height={84} />
          </View>
        ) : rows.length === 0 ? (
          <FKCard>
            <Text style={TYPE.heading}>No badges yet</Text>
            <Text style={[TYPE.body, { marginTop: 6 }]}>
              Badges will show up here once there are some to earn. Check back soon.
            </Text>
          </FKCard>
        ) : (
          <>
            <FKCard style={styles.summary}>
              <Text style={styles.summaryNumber}>{earned.length}</Text>
              <View style={{ flex: 1 }}>
                <Text style={TYPE.label}>
                  {earned.length === 1 ? "badge" : "badges"} earned by {selectedName}
                </Text>
                <Text style={[TYPE.bodySmall, { marginTop: 2 }]}>
                  {toEarn.length === 0 ? "Every badge collected. Well done." : `${toEarn.length} still to earn`}
                </Text>
                <View style={styles.track}>
                  <View
                    style={[styles.fill, { width: `${rows.length ? Math.round((earned.length / rows.length) * 100) : 0}%` }]}
                  />
                </View>
              </View>
            </FKCard>

            <FKEyebrow style={styles.section}>Earned</FKEyebrow>
            {earned.length === 0 ? (
              <FKCard>
                <Text style={TYPE.label}>{selectedName} hasn&apos;t earned a badge yet</Text>
                <Text style={[TYPE.bodySmall, { marginTop: 4, marginBottom: 14 }]}>
                  Finishing missions is the quickest way to get the first one.
                </Text>
                <FKButton label="Find a mission" onPress={() => router.navigate("/(tabs)/missions")} />
              </FKCard>
            ) : (
              <View style={styles.grid}>
                {earned.map((badge) => (
                  <Pressable
                    key={badge.badge_id}
                    onPress={() => openBadge(badge)}
                    style={[styles.tile, { width: tileWidth }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${badge.name}, earned`}
                  >
                    <BadgeImage badge={{ image_url: badge.image_url }} size={Math.min(72, tileWidth - 28)} emojiFontSize={44} />
                    <Text style={styles.tileName} numberOfLines={2}>
                      {badge.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {toEarn.length > 0 ? (
              <>
                <FKEyebrow style={styles.section}>Still to earn</FKEyebrow>
                {toEarn.map((badge) => {
                  const manual = badge.badge_type === "manual";
                  return (
                    <Pressable
                      key={badge.badge_id}
                      onPress={() => openBadge(badge)}
                      style={styles.row}
                      accessibilityRole="button"
                      accessibilityLabel={`${badge.name}, ${progressLabel(badge)}`}
                    >
                      <View style={styles.rowIcon}>
                        <View style={{ opacity: 0.4 }}>
                          <BadgeImage badge={{ image_url: badge.image_url }} size={40} emojiFontSize={30} />
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {badge.name}
                        </Text>
                        <Text style={styles.rowSub}>{progressLabel(badge)}</Text>
                        {!manual ? (
                          <View style={[styles.track, { marginTop: 8 }]}>
                            <View
                              style={[
                                styles.fill,
                                { width: `${Math.max(0, Math.min(100, Math.round(badge.progress_percent || 0)))}%` },
                              ]}
                            />
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </>
            ) : null}
          </>
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
        progressText={
          selectedBadge && !selectedBadge.earned && selectedBadge.badge_type !== "manual"
            ? `${selectedName}: ${progressLabel(selectedBadge)} so far`
            : undefined
        }
        onClose={() => setSelectedBadge(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FK.moss },
  content: {
    paddingHorizontal: H_PAD,
    paddingTop: 12,
    paddingBottom: 24,
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
  },
  switcher: { gap: 8, paddingBottom: 16 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: FK.paper,
    borderRadius: RADIUS.pill,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    minHeight: 44,
  },
  pillActive: { backgroundColor: FK.ink },
  pillText: { fontFamily: FONT.display, fontSize: 16, color: FK.ink },
  pillCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 6,
    backgroundColor: "#E3E8DA",
    alignItems: "center",
    justifyContent: "center",
  },
  pillCountText: { fontFamily: FONT.display, fontSize: 14, color: FK.ink },
  summary: { flexDirection: "row", alignItems: "center", gap: 16 },
  summaryNumber: { fontFamily: FONT.display, fontSize: 48, lineHeight: 52, color: FK.ink, letterSpacing: -1 },
  track: { height: 8, borderRadius: 4, backgroundColor: FK.line, overflow: "hidden", marginTop: 10 },
  fill: { height: 8, borderRadius: 4, backgroundColor: FK.forest },
  section: { marginTop: 22, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: {
    backgroundColor: FK.paper,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 8,
  },
  tileName: { fontFamily: FONT.displayBold, fontSize: 14, lineHeight: 17, color: FK.ink, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: FK.paper,
    borderRadius: RADIUS.md,
    padding: 12,
    paddingRight: 16,
    marginBottom: 8,
  },
  rowIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: FK.moss,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontFamily: FONT.display, fontSize: 17, color: FK.ink },
  rowSub: { fontFamily: FONT.body, fontSize: 14, color: FK.muted, marginTop: 2 },
});
