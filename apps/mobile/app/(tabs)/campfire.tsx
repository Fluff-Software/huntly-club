import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { preload as preloadAudio } from "expo-audio";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { CampfireStage } from "@/components/campfire/CampfireStage";
import { useCampfireAudio } from "@/components/campfire/useCampfireAudio";
import { useCampfireVideoPlayers } from "@/components/campfire/useCampfireVideoPlayers";
import {
  collectMediaUrls,
  getCampfireSessionBundle,
  getLatestReplaySession,
  sessionDurationMs,
  type CampfireSessionBundle,
} from "@/services/campfireService";

const BG = require("@/assets/images/campfire-bg.jpg");

/** Hard cap so a slow/broken asset can never trap the user on the spinner. */
const PREPARE_TIMEOUT_MS = 15000;

type LoadState = "loading" | "preparing" | "ready" | "empty" | "error";

export default function CampfireScreen() {
  const { scaleW, width, height } = useLayoutScale();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [bundle, setBundle] = useState<CampfireSessionBundle | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);

  const { players: videoPlayers, ready: videosReady } = useCampfireVideoPlayers(
    bundle?.components ?? null
  );

  const durationMs = bundle ? sessionDurationMs(bundle) : 0;
  const finished = durationMs > 0 && currentTimeMs >= durationMs;

  // 1. Load the latest replay session and its content.
  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    (async () => {
      const session = await getLatestReplaySession();
      if (cancelled) return;
      if (!session) {
        setLoadState("empty");
        return;
      }
      const data = await getCampfireSessionBundle(session.id);
      if (cancelled) return;
      if (!data) {
        setLoadState("error");
        return;
      }
      setBundle(data);
      setCurrentTimeMs(0);
      setLoadState("preparing");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Prefetch images + audio so they render/start instantly once shown.
  useEffect(() => {
    if (loadState !== "preparing" || !bundle) return;
    let cancelled = false;
    const { images, audio } = collectMediaUrls(bundle);
    const tasks: Promise<unknown>[] = [];
    if (images.length > 0) {
      tasks.push(ExpoImage.prefetch(images, "memory-disk"));
    }
    for (const url of audio) {
      tasks.push(preloadAudio({ uri: url }));
    }
    Promise.allSettled(tasks).then(() => {
      if (!cancelled) setMediaReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loadState, bundle]);

  // 3. Reveal the stage only once images, audio and video are all ready.
  useEffect(() => {
    if (loadState !== "preparing") return;
    if (mediaReady && videosReady) {
      setLoadState("ready");
      setIsPlaying(true);
    }
  }, [loadState, mediaReady, videosReady]);

  // 3b. Safety net: never block the user indefinitely on preparing.
  useEffect(() => {
    if (loadState !== "preparing") return;
    const timer = setTimeout(() => {
      setLoadState("ready");
      setIsPlaying(true);
    }, PREPARE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loadState]);

  // Pause playback when the screen loses focus.
  useFocusEffect(
    useCallback(() => {
      return () => setIsPlaying(false);
    }, [])
  );

  // Timeline clock.
  useEffect(() => {
    if (!isPlaying || durationMs <= 0) return;
    let raf: number;
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      const delta = now - last;
      last = now;
      setCurrentTimeMs((t) => {
        const next = t + delta;
        if (next >= durationMs) {
          setIsPlaying(false);
          return durationMs;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, durationMs]);

  useCampfireAudio(bundle?.components ?? [], currentTimeMs, isPlaying);

  const togglePlay = useCallback(() => {
    if (finished) {
      setCurrentTimeMs(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((p) => !p);
  }, [finished]);

  const handleClose = useCallback(() => {
    setIsPlaying(false);
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, []);

  const progress = durationMs > 0 ? Math.min(1, currentTimeMs / durationMs) : 0;
  const showSpinner = loadState === "loading" || loadState === "preparing";

  return (
    <View style={styles.container}>
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <View style={styles.overlay} />

        {loadState === "ready" && bundle && (
          <Pressable style={StyleSheet.absoluteFill} onPress={togglePlay}>
            <CampfireStage
              width={width}
              height={height}
              scaleW={scaleW}
              currentTimeMs={currentTimeMs}
              isPlaying={isPlaying}
              tracks={bundle.tracks}
              components={bundle.components}
              activities={bundle.activities}
              captains={bundle.captains}
              approvedPhotos={bundle.approvedPhotos}
              videoPlayers={videoPlayers}
            />
          </Pressable>
        )}

        {showSpinner && (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <ThemedText
              style={{
                marginTop: scaleW(12),
                fontSize: scaleW(14),
                fontWeight: "600",
                color: "#FFFFFF",
              }}
            >
              Getting the campfire ready…
            </ThemedText>
          </View>
        )}

        {(loadState === "empty" || loadState === "error") && (
          <View style={styles.centerFill}>
            <View style={styles.messageCard}>
              <MaterialIcons
                name="local-fire-department"
                size={scaleW(40)}
                color="#C47A2A"
              />
              <ThemedText
                type="heading"
                style={{
                  fontSize: scaleW(20),
                  fontWeight: "800",
                  color: "#3B1A06",
                  textAlign: "center",
                  marginTop: scaleW(8),
                }}
              >
                {loadState === "empty"
                  ? "No campfire yet"
                  : "Something went wrong"}
              </ThemedText>
              <ThemedText
                style={{
                  fontSize: scaleW(14),
                  color: "#6B3D1A",
                  textAlign: "center",
                  marginTop: scaleW(4),
                }}
              >
                {loadState === "empty"
                  ? "Check back soon to watch the previous campfire."
                  : "We couldn't load the campfire. Please try again."}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Paused / finished hint */}
        {loadState === "ready" && (!isPlaying || finished) && (
          <View style={styles.centerFill} pointerEvents="none">
            <View style={styles.playBadge}>
              <MaterialIcons
                name={finished ? "replay" : "play-arrow"}
                size={scaleW(44)}
                color="#FFFFFF"
              />
            </View>
          </View>
        )}

        <SafeAreaView style={styles.controls} edges={["top"]} pointerEvents="box-none">
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MaterialIcons name="close" size={scaleW(24)} color="#FFFFFF" />
          </Pressable>
        </SafeAreaView>

        {loadState === "ready" && durationMs > 0 && (
          <SafeAreaView style={styles.progressWrap} edges={["bottom"]} pointerEvents="none">
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </SafeAreaView>
        )}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  centerFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  messageCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 28,
    marginHorizontal: 40,
    alignItems: "center",
    maxWidth: 320,
  },
  playBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  controls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
  },
  closeButton: {
    marginTop: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  progressTrack: {
    height: 4,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#C47A2A",
  },
});
