import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInUp,
  withTiming,
  withRepeat,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
} from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useFirstSeason } from "@/hooks/useFirstSeason";
import { useAllChapters } from "@/hooks/useAllChapters";

type StorySlide =
  | { type: "text"; value: string }
  | { type: "image"; value: string }
  | { type: "text-image"; text: string; image: string };

const FALLBACK_SLIDES: StorySlide[] = [
  { type: "text", value: "With the wind came a strong sense of urgency." },
  { type: "text", value: "The explorers went forth to explore." },
  { type: "text", value: "Through the whispering trees they found a hidden path." },
  { type: "text", value: "Something magical was waiting just ahead." },
  { type: "text", value: "And so the adventure began." },
];

const STORY_BLUE = "#4B9CD2";
const STORY_CONTAINER_BG = "#1E2E28";
const CREAM = "#F4F0EB";
const DARK_GREEN = "#2D5A27";
const AUTO_PLAY_INTERVAL_MS = 3000;

function imageSlideEntering() {
  "worklet";
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.96 }] },
    animations: {
      opacity: withTiming(1, { duration: 450 }),
      transform: [{ scale: withTiming(1, { duration: 450 }) }],
    },
  };
}

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

function ImageSlide({
  imageUri,
  isActive,
  onPress,
  width,
  slideStyles,
}: {
  imageUri: string;
  isActive: boolean;
  onPress: () => void;
  width: number;
  slideStyles: {
    slide: object;
    slideInner: object;
    slideImage: object;
    slideImageWrap: object;
    slideImageBgLayer: object;
  };
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[slideStyles.slide, { width }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Image slide. Tap to continue."
    >
      <Image
        source={{ uri: imageUri }}
        style={[slideStyles.slideImageBgLayer, { opacity: isActive ? 1 : 0 }]}
        resizeMode="cover"
        accessible={false}
      />
      <BlurView
        intensity={80}
        tint="dark"
        style={[StyleSheet.absoluteFill, slideStyles.slideImageBgLayer, { opacity: isActive ? 1 : 0 }]}
      />
      <View style={slideStyles.slideInner}>
        <Animated.View
          entering={isActive ? imageSlideEntering : undefined}
          style={[
            slideStyles.slideInner,
            slideStyles.slideImageWrap,
            { width, opacity: isActive ? 1 : 0 },
          ]}
        >
          <Image
            source={{ uri: imageUri }}
            style={slideStyles.slideImage}
            resizeMode="contain"
            accessible={isActive}
            accessibilityRole="image"
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}

function TextImageSlide({
  text,
  imageUri,
  isActive,
  onPress,
  scaleW,
  width,
  slideStyles,
}: {
  text: string;
  imageUri: string;
  isActive: boolean;
  onPress: () => void;
  scaleW: (n: number) => number;
  width: number;
  slideStyles: {
    slide: object;
    slideInner: object;
    sentence: object;
    letterRow: object;
    slideImage: object;
    slideImageWrap: object;
    slideImageBgLayer: object;
  };
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[slideStyles.slide, { width }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Story image with caption: ${text}. Tap to continue.`}
    >
      <Image
        source={{ uri: imageUri }}
        style={[slideStyles.slideImageBgLayer, { opacity: isActive ? 1 : 0 }]}
        resizeMode="cover"
        accessible={false}
      />
      <BlurView
        intensity={80}
        tint="dark"
        style={[StyleSheet.absoluteFill, slideStyles.slideImageBgLayer, { opacity: isActive ? 1 : 0 }]}
      />
      <View style={slideStyles.slideInner}>
        <Animated.View
          entering={isActive ? imageSlideEntering : undefined}
          style={[
            slideStyles.slideInner,
            slideStyles.slideImageWrap,
            { width, opacity: isActive ? 1 : 0 },
          ]}
        >
          <Image
            source={{ uri: imageUri }}
            style={[slideStyles.slideImage, { flex: undefined, height: scaleW(240) }]}
            resizeMode="contain"
            accessible={isActive}
            accessibilityRole="image"
          />
          <AnimatedSentence
            sentence={text}
            isActive={isActive}
            scaleW={scaleW}
            slideStyles={slideStyles}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}

function SlideItem({
  slide,
  isActive,
  onPress,
  scaleW,
  width,
  slideStyles,
}: {
  slide: StorySlide;
  isActive: boolean;
  onPress: () => void;
  scaleW: (n: number) => number;
  width: number;
  slideStyles: {
    slide: object;
    slideInner: object;
    sentence: object;
    letterRow: object;
    slideImage: object;
    slideImageWrap: object;
    slideImageBgLayer: object;
  };
}) {
  if (slide.type === "image") {
    return (
      <ImageSlide
        imageUri={slide.value}
        isActive={isActive}
        onPress={onPress}
        width={width}
        slideStyles={slideStyles}
      />
    );
  }
  if (slide.type === "text-image") {
    return (
      <TextImageSlide
        text={slide.text}
        imageUri={slide.image}
        isActive={isActive}
        onPress={onPress}
        scaleW={scaleW}
        width={width}
        slideStyles={slideStyles}
      />
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={[slideStyles.slide, { width }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Story: ${slide.value}. Tap to continue.`}
    >
      <View style={slideStyles.slideInner}>
        {isActive && (
          <AnimatedSentence
            sentence={slide.value}
            isActive={isActive}
            scaleW={scaleW}
            slideStyles={slideStyles}
          />
        )}
      </View>
    </Pressable>
  );
}

function BouncingDot({ delay, scaleW }: { delay: number; scaleW: (n: number) => number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-scaleW(8), { duration: 350 }),
          withTiming(0, { duration: 350 })
        ),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          width: scaleW(8),
          height: scaleW(8),
          borderRadius: scaleW(4),
          backgroundColor: CREAM,
          marginHorizontal: scaleW(4),
          opacity: 0.7,
        },
      ]}
    />
  );
}

function StoryLoadingScreen({ scaleW }: { scaleW: (n: number) => number }) {
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{ alignItems: "center", justifyContent: "center", gap: scaleW(16) }}
    >
      <Text
        style={{
          color: CREAM,
          fontSize: scaleW(15),
          fontWeight: "500",
          opacity: 0.8,
        }}
      >
        Loading story
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <BouncingDot delay={0} scaleW={scaleW} />
        <BouncingDot delay={150} scaleW={scaleW} />
        <BouncingDot delay={300} scaleW={scaleW} />
      </View>
    </Animated.View>
  );
}

export default function StorySlidesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string; chapterId?: string }>();
  const { firstSeason, loading: seasonLoading } = useFirstSeason();
  const { chapters, loading: chaptersLoading } = useAllChapters();
  const dataLoading = seasonLoading || chaptersLoading;
  const { width } = useWindowDimensions();
  const { scaleW } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const currentIndexRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [storyReady, setStoryReady] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);

  const slides = useMemo((): StorySlide[] => {
    const fromSlides = (raw: StorySlide[] | null | undefined): StorySlide[] | null => {
      if (raw?.length) return raw;
      return null;
    };
    const fromParts = (raw: string[] | null | undefined): StorySlide[] | null => {
      if (raw?.length) return raw.map((v) => ({ type: "text" as const, value: v }));
      return null;
    };
    if (params.source === "chapter" && params.chapterId) {
      const chapter = chapters.find((c) => c.id === Number(params.chapterId));
      const out = fromSlides(chapter?.body_slides ?? undefined) ?? fromParts(chapter?.body_parts);
      if (out?.length) return out;
    }
    if (params.source === "season") {
      const out =
        fromSlides(firstSeason?.story_slides ?? undefined) ?? fromParts(firstSeason?.story_parts);
      if (out?.length) return out;
    }
    return FALLBACK_SLIDES;
  }, [
    params.source,
    params.chapterId,
    firstSeason?.story_slides,
    firstSeason?.story_parts,
    chapters,
  ]);

  const imageUris = useMemo(
    () =>
      slides.flatMap((s) => {
        if (s.type === "image") return [s.value];
        if (s.type === "text-image") return [s.image];
        return [];
      }),
    [slides]
  );

  useEffect(() => {
    if (dataLoading) {
      setStoryReady(false);
      return;
    }
    if (imageUris.length === 0) {
      setStoryReady(true);
      return;
    }
    setStoryReady(false);
    let cancelled = false;
    Promise.allSettled(imageUris.map((uri) => Image.prefetch(uri))).then(() => {
      if (!cancelled) setStoryReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [dataLoading, imageUris]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (!autoPlay || !flatListRef.current) return;
    const id = setInterval(() => {
      const idx = currentIndexRef.current;
      if (idx >= slides.length - 1) {
        setAutoPlay(false);
        return;
      }
      flatListRef.current?.scrollToOffset({
        offset: (idx + 1) * width,
        animated: true,
      });
    }, AUTO_PLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoPlay, slides.length, width]);

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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: STORY_CONTAINER_BG },
        slidesWrapper: {
          flex: 1,
        },
        loadingContainer: {
          justifyContent: "center",
          alignItems: "center",
        },
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
        slideImage: {
          width: "100%",
          flex: 1,
          maxWidth: width,
        },
        slideImageWrap: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        slideImageBgLayer: {
          ...StyleSheet.absoluteFillObject,
        },
        bottomControls: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: "column",
          alignItems: "center",
          paddingBottom: insets.bottom,
        },
        playButton: {
          padding: scaleW(10),
          borderRadius: scaleW(20),
          backgroundColor: "rgba(255,255,255,0.25)",
          marginBottom: scaleW(8),
        },
        dotsRow: {
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: scaleW(8),
          paddingVertical: scaleW(12),
        },
        missionsCta: {
          position: "absolute",
          bottom: scaleW(56) + insets.bottom,
          left: scaleW(24),
          right: scaleW(24),
          backgroundColor: CREAM,
          borderRadius: scaleW(28),
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(32),
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
        missionsCtaText: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: DARK_GREEN,
        },
        dot: {
          width: scaleW(8),
          height: scaleW(8),
          borderRadius: scaleW(4),
        },
      }),
    [scaleW, insets.bottom, width]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: StorySlide; index: number }) => (
      <SlideItem
        slide={item}
        isActive={currentIndex === index}
        onPress={goNext}
        scaleW={scaleW}
        width={width}
        slideStyles={styles}
      />
    ),
    [currentIndex, goNext, scaleW, width, styles]
  );

  if (!storyReady) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={["top", "left", "right"]}>
        <StoryLoadingScreen scaleW={scaleW} />
        {/* Render images at 0 size so the RN image pipeline decodes them before display */}
        {imageUris.map((uri) => (
          <Image key={uri} source={{ uri }} style={{ width: 0, height: 0 }} accessible={false} />
        ))}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.slidesWrapper}>
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
        <View style={styles.bottomControls}>
          {currentIndex !== slides.length - 1 && (
            <Pressable
              onPress={() => setAutoPlay((prev) => !prev)}
              style={styles.playButton}
              accessible
              accessibilityRole="button"
              accessibilityLabel={autoPlay ? "Pause auto-play" : "Play automatically"}
            >
              <MaterialIcons
                name={autoPlay ? "pause" : "play-arrow"}
                size={scaleW(24)}
                color="#FFF"
              />
            </Pressable>
          )}
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
        </View>
        {currentIndex === slides.length - 1 && (
          <Pressable
            onPress={() => router.push("/(tabs)/missions")}
            style={styles.missionsCta}
            accessible
            accessibilityRole="button"
            accessibilityLabel="View missions"
          >
            <Text style={styles.missionsCtaText}>View missions →</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

