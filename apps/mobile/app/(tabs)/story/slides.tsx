import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useFirstSeason } from "@/hooks/useFirstSeason";
import { useAllChapters } from "@/hooks/useAllChapters";

const STORY_SLIDES: string[] = [
  "With the wind came a strong sense of urgency.",
  "The explorers went forth to explore.",
  "Through the whispering trees they found a hidden path.",
  "Something magical was waiting just ahead.",
  "And so the adventure began.",
];

const STORY_BLUE = "#4B9CD2";
const CREAM = "#F4F0EB";

const WORD_DURATION = 140;
const WORD_DELAY_MS = 60;

function splitOnWhitespace(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function AnimatedSentence({
  sentence,
  isActive,
  scaleW,
  slideStyles,
}: {
  sentence: string;
  isActive: boolean;
  scaleW: (n: number) => number;
  slideStyles: { sentence: object; letterRow: object };
}) {
  const wordStyle = useMemo(
    () => [
      slideStyles.sentence,
      { fontSize: scaleW(24), lineHeight: scaleW(34) },
    ],
    [slideStyles.sentence, scaleW]
  );
  const words = useMemo(() => splitOnWhitespace(sentence), [sentence]);

  if (!isActive) return null;

  return (
    <View style={slideStyles.letterRow}>
      {words.map((word, index) => (
        <Animated.Text
          key={`${index}-${word}`}
          entering={FadeInUp.duration(WORD_DURATION)
            .delay(40 + index * WORD_DELAY_MS)
            .springify()
            .damping(22)
            .withInitialValues({ transform: [{ translateY: -8 }] })}
          style={wordStyle}
        >
          {word}
          {index < words.length - 1 ? "\u00A0" : ""}
        </Animated.Text>
      ))}
    </View>
  );
}

function SlideItem({
  sentence,
  isActive,
  onPress,
  scaleW,
  width,
  slideStyles,
}: {
  sentence: string;
  isActive: boolean;
  onPress: () => void;
  scaleW: (n: number) => number;
  width: number;
  slideStyles: { slide: object; slideInner: object; sentence: object; letterRow: object };
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[slideStyles.slide, { width }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Story: ${sentence}. Tap to continue.`}
    >
      <View style={slideStyles.slideInner}>
        {isActive && (
          <AnimatedSentence
            sentence={sentence}
            isActive={isActive}
            scaleW={scaleW}
            slideStyles={slideStyles}
          />
        )}
      </View>
    </Pressable>
  );
}

export default function StorySlidesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string; chapterId?: string }>();
  const { firstSeason } = useFirstSeason();
  const { chapters } = useAllChapters();
  const { width } = useWindowDimensions();
  const { scaleW } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = useMemo(() => {
    if (params.source === "chapter" && params.chapterId) {
      const chapter = chapters.find((c) => c.id === Number(params.chapterId));
      const parts = chapter?.body_parts;
      if (parts?.length) return parts;
    }
    if (params.source === "season") {
      const parts = firstSeason?.story_parts;
      if (parts?.length) return parts;
    }
    return STORY_SLIDES;
  }, [params.source, params.chapterId, firstSeason?.story_parts, chapters]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  }, [width]);

  const goNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToOffset({
        offset: (currentIndex + 1) * width,
        animated: true,
      });
    } else {
      router.back();
    }
  }, [currentIndex, width, slides.length]);

  const viewabilityConfig = useMemo(
    () => ({ viewAreaCoveragePercentThreshold: 60 }),
    []
  );
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      const index = viewableItems[0]?.index ?? 0;
      setCurrentIndex(index);
    },
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <SlideItem
        sentence={item}
        isActive={currentIndex === index}
        onPress={goNext}
        scaleW={scaleW}
        width={width}
        slideStyles={styles}
      />
    ),
    [currentIndex, goNext, scaleW, width, styles]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: STORY_BLUE },
        slide: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        slideInner: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          maxWidth: "100%",
        },
        sentence: {
          color: "#FFF",
          fontWeight: "600",
          textAlign: "center",
        },
        letterRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: scaleW(32),
        },
        dotsRow: {
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: scaleW(8),
          paddingVertical: scaleW(16),
        },
        dot: {
          width: scaleW(8),
          height: scaleW(8),
          borderRadius: scaleW(4),
        },
        backButton: {
          position: "absolute",
          top: insets.top + scaleW(8),
          left: insets.left + scaleW(16),
          zIndex: 10,
          paddingVertical: scaleW(8),
          paddingHorizontal: scaleW(16),
          borderRadius: scaleW(20),
          backgroundColor: "rgba(255,255,255,0.25)",
        },
        backButtonText: {
          color: "#FFF",
          fontSize: scaleW(15),
          fontWeight: "600",
        },
      }),
    [scaleW, insets.top, insets.left]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Back to story"
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </Pressable>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === currentIndex ? CREAM : "rgba(255,255,255,0.4)" },
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

