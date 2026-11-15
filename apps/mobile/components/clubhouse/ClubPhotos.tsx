import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { FK, FONT, RADIUS, teamKeyFromName } from "@/constants/fieldKit";
import { GUIDES } from "@/constants/guides";
import { type ClubPhotoCardItem, getRandomClubPhotos } from "@/services/activityProgressService";

const PAGE_SIZE = 6;
const MAX_CARDS = 24;
const CARD_WIDTH = 236;
const CARD_GAP = 12;
const AUTHOR_COLOURS = ["#D4A05A", "#8B7BA8", "#7A9B76", "#5B8A9E", "#C97B6C"];

/**
 * "From around the club": photos other explorers have shared from their missions.
 * Cards tilt as they slide past, like photos pinned to a board.
 */
export function ClubPhotos() {
  const { width } = useWindowDimensions();
  const [cards, setCards] = useState<ClubPhotoCardItem[] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    getRandomClubPhotos(PAGE_SIZE)
      .then((c) => !cancelled && setCards(c))
      .catch(() => !cancelled && setCards([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (!cards || loadingMoreRef.current || cards.length === 0 || cards.length >= MAX_CARDS) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const more = await getRandomClubPhotos(Math.min(PAGE_SIZE, MAX_CARDS - cards.length), cards.map((c) => c.id));
      const seen = new Set(cards.map((c) => c.id));
      setCards((prev) => (prev ?? []).concat(more.filter((c) => !seen.has(c.id))));
    } catch {
      // Not worth interrupting anyone over.
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [cards]);

  // Nothing shared yet (or offline): leave the Clubhouse without an empty box.
  if (!cards || cards.length === 0) return null;

  const step = CARD_WIDTH + CARD_GAP;
  // Centre the first card in the panel.
  const sidePad = Math.max(16, Math.round((width - 40 - CARD_WIDTH) / 2));

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>From around the club</Text>
      <Text style={styles.sub}>What other explorers have been making</Text>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: sidePad, gap: CARD_GAP, paddingVertical: 10 }}
        style={{ overflow: "visible" }}
        nestedScrollEnabled={Platform.OS === "android"}
        removeClippedSubviews={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        snapToInterval={step}
        snapToAlignment="start"
        decelerationRate="fast"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
          listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            if (contentOffset.x + layoutMeasurement.width >= contentSize.width - 150) void loadMore();
          },
        })}
      >
        {cards.map((card, index) => {
          const centre = index * step;
          const rotate = scrollX.interpolate({
            inputRange: [centre - 140, centre, centre + 140],
            outputRange: ["-4deg", "0deg", "4deg"],
            extrapolate: "clamp",
          });
          const guide = GUIDES.find((g) => g.team === teamKeyFromName(card.team_name));
          return (
            <Animated.View key={card.id} style={[styles.card, { transform: [{ rotate }] }]}>
              <Image
                source={{ uri: card.thumb_url || card.photo_url }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
                accessibilityLabel={`${card.title}, by ${card.author}`}
              />
              <View style={styles.captions}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {card.title}
                </Text>
                <Text style={[styles.author, { backgroundColor: AUTHOR_COLOURS[index % AUTHOR_COLOURS.length] }]} numberOfLines={1}>
                  by {card.author}
                </Text>
              </View>
              {guide ? (
                <View style={[styles.badge, { backgroundColor: guide.colour }]}>
                  <Image source={guide.badge} style={{ width: 28, height: 28 }} contentFit="contain" />
                </View>
              ) : null}
            </Animated.View>
          );
        })}
        {loadingMore ? (
          <View style={[styles.card, styles.more]}>
            <ActivityIndicator color={FK.skyInk} />
          </View>
        ) : null}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#BFE3E8",
    borderRadius: RADIUS.lg,
    borderWidth: 3,
    borderColor: FK.white,
    paddingTop: 18,
    paddingBottom: 12,
    marginHorizontal: -4,
    marginBottom: 14,
    overflow: Platform.OS === "android" ? "visible" : undefined,
  },
  title: { fontFamily: FONT.display, fontSize: 22, color: "#1A5C6B", textAlign: "center" },
  sub: { fontFamily: FONT.body, fontSize: 14, color: "#3F7581", textAlign: "center", marginTop: 2 },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.05,
    borderRadius: RADIUS.md,
    borderWidth: 4,
    borderColor: FK.white,
    overflow: "hidden",
    backgroundColor: "#A9D3DA",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  more: { width: 90, alignItems: "center", justifyContent: "center" },
  captions: { position: "absolute", left: 10, right: 52, bottom: 10, alignItems: "flex-start", gap: 6 },
  cardTitle: {
    fontFamily: FONT.display,
    fontSize: 16,
    color: FK.ink,
    backgroundColor: FK.white,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: "hidden",
    maxWidth: "100%",
  },
  author: {
    fontFamily: FONT.displayBold,
    fontSize: 14,
    color: FK.white,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: "hidden",
    maxWidth: "100%",
  },
  badge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: FK.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
