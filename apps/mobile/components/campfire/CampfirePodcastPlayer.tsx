import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  setAudioModeAsync,
  setIsAudioActiveAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { FK, FONT } from "@/constants/fieldKit";
import { DEFAULT_PODCAST_HOST } from "@/services/campfireService";
import type { CampfireListenTracker } from "@/hooks/useCampfireListenTracking";

/** Firelight glow behind the play button. */
const EMBER_GLOW = "rgba(255, 170, 80, 0.28)";
const SKIP_SEC = 10;
const KEEP_AWAKE_TAG = "campfire-radio";

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

  // Audio doesn't play in the background, so a screen that dims and locks
  // would cut the episode off. Hold the screen awake only while it plays.
  const keepAwake = active && status.playing;
  useEffect(() => {
    if (!keepAwake) return;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [keepAwake]);

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
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(8,14,10,0)", "rgba(8,14,10,0.55)", "rgba(8,14,10,0.85)"]}
        locations={[0, 0.45, 1]}
        style={styles.fade}
      />
      <SafeAreaView edges={["bottom"]} style={styles.bottom} pointerEvents="box-none">
        <View
          style={[
            styles.card,
            {
              marginHorizontal: scaleW(14),
              marginBottom: scaleW(14),
              borderRadius: scaleW(32),
            },
          ]}
        >
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.glassTint]} />
          <View
            style={{
              paddingHorizontal: scaleW(22),
              paddingTop: scaleW(20),
              paddingBottom: scaleW(18),
            }}
          >
            <View style={[styles.hostPill, { paddingHorizontal: scaleW(12), paddingVertical: scaleW(6), gap: scaleW(8) }]}>
              <OnAirDot playing={playing} size={scaleW(8)} />
              <Text style={[styles.hostText, { fontSize: scaleW(11) }]} numberOfLines={1}>
                {playing ? "On air · " : ""}
                {host?.trim() || DEFAULT_PODCAST_HOST}
              </Text>
            </View>

            <Text
              style={[styles.title, { marginTop: scaleW(14), fontSize: scaleW(26), lineHeight: scaleW(30) }]}
              numberOfLines={2}
            >
              {title}
            </Text>
            {description ? (
              <Text
                style={[styles.description, { marginTop: scaleW(6), fontSize: scaleW(14), lineHeight: scaleW(20) }]}
                numberOfLines={3}
              >
                {description}
              </Text>
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
              <Text style={[styles.time, { fontSize: scaleW(12) }]}>{formatClock(shownPositionMs)}</Text>
              <Text style={[styles.time, { fontSize: scaleW(12) }]}>
                {durationMs > 0 ? `-${formatClock(durationMs - shownPositionMs)}` : "--:--"}
              </Text>
            </View>

            <View style={[styles.controls, { gap: scaleW(26), marginTop: scaleW(10) }]}>
              <CircleButton
                size={scaleW(54)}
                onPress={() => skip(-SKIP_SEC)}
                disabled={loading}
                accessibilityLabel={`Back ${SKIP_SEC} seconds`}
                style={styles.skipButton}
              >
                <MaterialIcons name="replay-10" size={scaleW(28)} color={FK.white} />
              </CircleButton>

              <View style={[styles.playGlow, { width: scaleW(98), height: scaleW(98), borderRadius: scaleW(49) }]}>
                <CircleButton
                  size={scaleW(84)}
                  onPress={togglePlay}
                  disabled={loading}
                  dimWhenDisabled={false}
                  accessibilityLabel={playing ? "Pause" : finished ? "Play again" : "Play"}
                  style={styles.playButton}
                >
                  {loading ? (
                    <ActivityIndicator color={FK.ink} />
                  ) : (
                    <Ionicons
                      name={playing ? "pause" : finished ? "refresh" : "play"}
                      size={scaleW(42)}
                      color={FK.ink}
                      // The play triangle looks off-centre without a nudge.
                      style={!playing && !finished ? { marginLeft: scaleW(5) } : undefined}
                    />
                  )}
                </CircleButton>
              </View>

              <CircleButton
                size={scaleW(54)}
                onPress={() => skip(SKIP_SEC)}
                disabled={loading}
                accessibilityLabel={`Forward ${SKIP_SEC} seconds`}
                style={styles.skipButton}
              >
                <MaterialIcons name="forward-10" size={scaleW(28)} color={FK.white} />
              </CircleButton>
            </View>

            {!hasStarted && !loading ? (
              <Text style={[styles.hint, { marginTop: scaleW(12), fontSize: scaleW(13) }]}>
                Press play and pull up a log by the fire
              </Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/**
 * Round button with a press-in scale. Styles are static and the pressed state is
 * tracked by hand: NativeWind's Pressable interop drops function styles.
 */
function CircleButton({
  size,
  onPress,
  disabled,
  dimWhenDisabled = true,
  accessibilityLabel,
  style,
  children,
}: {
  size: number;
  onPress: () => void;
  disabled?: boolean;
  dimWhenDisabled?: boolean;
  accessibilityLabel: string;
  style: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        style,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: disabled && dimWhenDisabled ? 0.35 : 1,
          transform: [{ scale: pressed ? 0.93 : 1 }],
        },
      ]}
    >
      {children}
    </Pressable>
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

  const thumb = scaleW(18);

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
        backgroundColor: playing ? "#FF5A3C" : "rgba(255, 255, 255, 0.4)",
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
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "62%",
  },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  glassTint: {
    backgroundColor: "rgba(16, 37, 27, 0.55)",
  },
  hostPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  hostText: {
    fontFamily: FONT.display,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: FK.sunbeam,
  },
  title: {
    fontFamily: FONT.display,
    letterSpacing: -0.4,
    textAlign: "center",
    color: FK.white,
  },
  description: {
    fontFamily: FONT.body,
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.72)",
  },
  track: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: FK.sunbeam,
  },
  thumb: {
    position: "absolute",
    backgroundColor: FK.white,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  time: {
    fontFamily: FONT.bodyBold,
    fontVariant: ["tabular-nums"],
    color: "rgba(255, 255, 255, 0.65)",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  skipButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  playGlow: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: EMBER_GLOW,
  },
  playButton: {
    backgroundColor: FK.sunbeam,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFB45A",
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  hint: {
    fontFamily: FONT.bodyBold,
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.7)",
  },
});
