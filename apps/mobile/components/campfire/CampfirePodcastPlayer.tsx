import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import {
  setAudioModeAsync,
  setIsAudioActiveAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { ThemedText } from "@/components/ThemedText";
import { DEFAULT_PODCAST_HOST } from "@/services/campfireService";
import type { CampfireListenTracker } from "@/hooks/useCampfireListenTracking";

const CREAM = "#FFF8EE";
const BROWN_DEEP = "#3B1A06";
const BROWN_MID = "#6B3D1A";
const AMBER = "#C47A2A";
const GREEN = "#2F6B43";
const SKIP_SEC = 10;

type Props = {
  audioUrl: string;
  title: string;
  host: string | null | undefined;
  description: string | null | undefined;
  scaleW: (n: number) => number;
  /** False while the screen is blurred — pauses playback. */
  active: boolean;
  tracker: CampfireListenTracker;
};

/**
 * Campfire "radio" episode: one recording, played on demand over the campfire
 * background with play / pause, ±10s and a scrubber.
 */
export function CampfirePodcastPlayer({
  audioUrl,
  title,
  host,
  description,
  scaleW,
  active,
  tracker,
}: Props) {
  const player = useAudioPlayer({ uri: audioUrl }, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const durationMs = Math.max(0, (status.duration || 0) * 1000);
  const positionMs = Math.max(0, (status.currentTime || 0) * 1000);
  const finished =
    status.didJustFinish ||
    (durationMs > 0 && positionMs >= durationMs - 250 && !status.playing);

  const [scrubFraction, setScrubFraction] = useState<number | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    // Leaving the campfire screen deactivates the audio session
    // (stopAllCampfireAudio), so re-enable it each time the player mounts.
    void (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          shouldPlayInBackground: false,
          interruptionMode: "doNotMix",
        });
        await setIsAudioActiveAsync(true);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (active) return;
    try {
      player.pause();
    } catch {
      // ignore — player may already be released
    }
  }, [active, player]);

  useEffect(() => {
    tracker.onPlayback({ playing: status.playing, positionMs, durationMs });
  }, [tracker, status.playing, positionMs, durationMs]);

  const completedReportedRef = useRef(false);
  useEffect(() => {
    if (status.didJustFinish && !completedReportedRef.current) {
      completedReportedRef.current = true;
      tracker.onCompleted();
    }
    if (!status.didJustFinish && status.playing) {
      completedReportedRef.current = false;
    }
  }, [status.didJustFinish, status.playing, tracker]);

  const togglePlay = useCallback(() => {
    if (!status.isLoaded) return;
    if (status.playing) {
      player.pause();
      return;
    }
    if (finished) {
      void player.seekTo(0);
    }
    player.play();
    setHasStarted(true);
    tracker.onPlayPressed();
  }, [status.isLoaded, status.playing, finished, player, tracker]);

  const skip = useCallback(
    (deltaSec: number) => {
      if (!status.isLoaded || durationMs <= 0) return;
      const next = Math.max(
        0,
        Math.min(durationMs / 1000, status.currentTime + deltaSec)
      );
      void player.seekTo(next);
    },
    [status.isLoaded, status.currentTime, durationMs, player]
  );

  const shownPositionMs =
    scrubFraction != null ? scrubFraction * durationMs : positionMs;
  const progress =
    durationMs > 0 ? Math.min(1, shownPositionMs / durationMs) : 0;

  const loading = !status.isLoaded;
  const playing = status.playing;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.dim} pointerEvents="none" />
      <SafeAreaView
        edges={["bottom"]}
        style={styles.bottom}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.card,
            {
              marginHorizontal: scaleW(18),
              marginBottom: scaleW(18),
              borderRadius: scaleW(28),
              paddingHorizontal: scaleW(20),
              paddingTop: scaleW(18),
              paddingBottom: scaleW(16),
            },
          ]}
        >
          <View style={[styles.hostPill, { paddingHorizontal: scaleW(10), paddingVertical: scaleW(4), gap: scaleW(6) }]}>
            <OnAirDot playing={playing} size={scaleW(8)} />
            <MaterialIcons name="radio" size={scaleW(14)} color={AMBER} />
            <ThemedText
              lightColor={BROWN_MID}
              darkColor={BROWN_MID}
              style={{
                fontSize: scaleW(11),
                fontWeight: "900",
                letterSpacing: 0.8,
                textTransform: "uppercase",
              }}
            >
              {host?.trim() || DEFAULT_PODCAST_HOST}
            </ThemedText>
          </View>

          <ThemedText
            type="heading"
            lightColor={BROWN_DEEP}
            darkColor={BROWN_DEEP}
            style={{
              marginTop: scaleW(10),
              fontSize: scaleW(22),
              lineHeight: scaleW(27),
              fontWeight: "900",
              textAlign: "center",
            }}
            numberOfLines={2}
          >
            {title}
          </ThemedText>
          {description ? (
            <ThemedText
              lightColor={BROWN_MID}
              darkColor={BROWN_MID}
              style={{
                marginTop: scaleW(6),
                fontSize: scaleW(13),
                lineHeight: scaleW(18),
                fontWeight: "600",
                textAlign: "center",
              }}
              numberOfLines={3}
            >
              {description}
            </ThemedText>
          ) : null}

          <Scrubber
            progress={progress}
            disabled={loading || durationMs <= 0}
            scaleW={scaleW}
            onScrub={setScrubFraction}
            onCommit={(fraction) => {
              setScrubFraction(null);
              if (durationMs > 0) {
                void player.seekTo((fraction * durationMs) / 1000);
              }
            }}
          />
          <View style={styles.timeRow}>
            <ThemedText
              lightColor={BROWN_MID}
              darkColor={BROWN_MID}
              style={[styles.time, { fontSize: scaleW(11) }]}
            >
              {formatClock(shownPositionMs)}
            </ThemedText>
            <ThemedText
              lightColor={BROWN_MID}
              darkColor={BROWN_MID}
              style={[styles.time, { fontSize: scaleW(11) }]}
            >
              {durationMs > 0 ? `-${formatClock(durationMs - shownPositionMs)}` : "--:--"}
            </ThemedText>
          </View>

          <View style={[styles.controls, { gap: scaleW(28), marginTop: scaleW(4) }]}>
            <Pressable
              onPress={() => skip(-SKIP_SEC)}
              disabled={loading}
              hitSlop={12}
              accessibilityLabel={`Back ${SKIP_SEC} seconds`}
              style={({ pressed }) => ({ opacity: loading ? 0.35 : pressed ? 0.6 : 1 })}
            >
              <MaterialIcons name="replay-10" size={scaleW(32)} color={BROWN_MID} />
            </Pressable>

            <Pressable
              onPress={togglePlay}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={playing ? "Pause" : "Play"}
              style={({ pressed }) => [
                styles.playButton,
                {
                  width: scaleW(76),
                  height: scaleW(76),
                  borderRadius: scaleW(38),
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={CREAM} />
              ) : (
                <MaterialIcons
                  name={playing ? "pause" : finished ? "replay" : "play-arrow"}
                  size={scaleW(44)}
                  color={CREAM}
                />
              )}
            </Pressable>

            <Pressable
              onPress={() => skip(SKIP_SEC)}
              disabled={loading}
              hitSlop={12}
              accessibilityLabel={`Forward ${SKIP_SEC} seconds`}
              style={({ pressed }) => ({ opacity: loading ? 0.35 : pressed ? 0.6 : 1 })}
            >
              <MaterialIcons name="forward-10" size={scaleW(32)} color={BROWN_MID} />
            </Pressable>
          </View>

          {!hasStarted && !loading ? (
            <ThemedText
              lightColor={BROWN_MID}
              darkColor={BROWN_MID}
              style={{
                marginTop: scaleW(10),
                fontSize: scaleW(12),
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Press play and pull up a log by the fire
            </ThemedText>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Scrubber({
  progress,
  disabled,
  scaleW,
  onScrub,
  onCommit,
}: {
  progress: number;
  disabled: boolean;
  scaleW: (n: number) => number;
  onScrub: (fraction: number) => void;
  onCommit: (fraction: number) => void;
}) {
  const trackRef = useRef<View>(null);
  const boundsRef = useRef<{ x: number; width: number } | null>(null);

  const measure = useCallback(() => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      boundsRef.current = { x, width };
    });
  }, []);

  const fractionFor = (e: GestureResponderEvent): number => {
    const b = boundsRef.current;
    if (!b || b.width <= 0) return progress;
    return Math.max(0, Math.min(1, (e.nativeEvent.pageX - b.x) / b.width));
  };

  const thumb = scaleW(16);

  return (
    <View
      ref={trackRef}
      onLayout={(_e: LayoutChangeEvent) => measure()}
      style={{ marginTop: scaleW(18), paddingVertical: scaleW(10) }}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        measure();
        onScrub(fractionFor(e));
      }}
      onResponderMove={(e) => onScrub(fractionFor(e))}
      onResponderRelease={(e) => onCommit(fractionFor(e))}
      onResponderTerminate={(e) => onCommit(fractionFor(e))}
    >
      <View style={[styles.track, { height: scaleW(6), borderRadius: scaleW(3) }]}>
        <View
          style={[
            styles.fill,
            { width: `${progress * 100}%`, borderRadius: scaleW(3) },
          ]}
        />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            width: thumb,
            height: thumb,
            borderRadius: thumb / 2,
            left: `${progress * 100}%`,
            marginLeft: -thumb / 2,
            top: scaleW(10) + scaleW(3) - thumb / 2,
            opacity: disabled ? 0 : 1,
          },
        ]}
      />
    </View>
  );
}

function OnAirDot({ playing, size }: { playing: boolean; size: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!playing) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [playing, pulse]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: playing ? "#E0452B" : "rgba(107, 61, 26, 0.35)",
        opacity: playing
          ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] })
          : 1,
      }}
    />
  );
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    backgroundColor: "rgba(255, 248, 238, 0.95)",
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  hostPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "rgba(196, 122, 42, 0.14)",
  },
  track: {
    backgroundColor: "rgba(59, 26, 6, 0.15)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: GREEN,
  },
  thumb: {
    position: "absolute",
    backgroundColor: GREEN,
    borderWidth: 2,
    borderColor: CREAM,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  time: {
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
