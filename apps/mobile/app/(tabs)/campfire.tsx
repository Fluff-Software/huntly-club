import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { CampfireStage } from "@/components/campfire/CampfireStage";
import { useCampfireAudio } from "@/components/campfire/useCampfireAudio";
import { useCampfireVideoPlayers } from "@/components/campfire/useCampfireVideoPlayers";
import { prepareCampfireMedia } from "@/components/campfire/prepareCampfireMedia";
import {
  getCampfireSessionBundle,
  getLatestReplaySession,
  getNextScheduledSession,
  getServerNowIso,
  resolveCampfirePlaybackSession,
  sessionDurationMs,
  type CampfireSessionBundle,
  type CampfireSessionRow,
} from "@/services/campfireService";
import {
  CAMPFIRE_PRELOAD_LEAD_MS,
  getCampfireLivePreload,
  invalidateCampfireLivePreload,
  startCampfireSessionPreload,
  waitForCampfireLivePreload,
} from "@/services/campfireLivePreload";
import { supabase } from "@/services/supabase";

const BG = require("@/assets/images/campfire-bg.jpg");

/** Hard cap so a slow/broken asset can never trap the user on the spinner. */
const PREPARE_TIMEOUT_MS = 15000;

type LoadState =
  | "loading"
  | "preparing"
  | "ready"
  | "countdown"
  | "empty"
  | "error";
type ReactionBurst = { id: string; emoji: string; createdAtMs: number };
type PresenceState = Record<string, unknown[]>;
type CountdownParts = { hrs: number; mins: number; secs: number };

function formatCountdown(ms: number): CountdownParts {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return { hrs, mins, secs };
}

export default function CampfireScreen() {
  const { scaleW, width, height } = useLayoutScale();
  const params = useLocalSearchParams<{ mode?: string }>();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [bundle, setBundle] = useState<CampfireSessionBundle | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [countdownMs, setCountdownMs] = useState<number>(0);
  const [waitingSession, setWaitingSession] =
    useState<CampfireSessionRow | null>(null);
  const waitingSessionRef = useRef<CampfireSessionRow | null>(null);
  const countdownTargetRef = useRef<number | null>(null);

  const { players: videoPlayers, ready: videosReady } = useCampfireVideoPlayers(
    bundle?.components ?? null
  );

  const durationMs = bundle ? sessionDurationMs(bundle) : 0;
  const finished = durationMs > 0 && currentTimeMs >= durationMs;
  const hasExitedAfterFinishRef = useRef(false);
  const liveClockRef = useRef<{
    deviceStartMs: number;
    playheadStartMs: number;
    durationMs: number;
  } | null>(null);
  const serverSkewMsRef = useRef(0);
  const liveResyncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isLiveRef = useRef(false);
  const [reactionBursts, setReactionBursts] = useState<ReactionBurst[]>([]);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const loadTokenRef = useRef(0);

  useEffect(() => {
    waitingSessionRef.current = waitingSession;
  }, [waitingSession]);

  const loadCampfire = useCallback(
    async (modeOverride?: string) => {
      const token = ++loadTokenRef.current;
      const mode = modeOverride ?? params.mode;

      const waitingId = waitingSessionRef.current?.id;
      const preloadedWhileWaiting =
        waitingId != null ? getCampfireLivePreload(waitingId) : null;

      hasExitedAfterFinishRef.current = false;
      if (!preloadedWhileWaiting) {
        setMediaReady(false);
      }
      setCurrentTimeMs(0);
      setIsPlaying(false);
      setLoadState("loading");

      const safeSet = (fn: () => void) => {
        if (loadTokenRef.current !== token) return;
        fn();
      };

      if (mode === "replay") {
        const session = await getLatestReplaySession();
        if (loadTokenRef.current !== token) return;
        if (!session) {
          safeSet(() => setLoadState("empty"));
          return;
        }
        const data = await getCampfireSessionBundle(session.id);
        if (loadTokenRef.current !== token) return;
        if (!data) {
          safeSet(() => setLoadState("error"));
          return;
        }
        safeSet(() => {
          setBundle(data);
          setCurrentTimeMs(0);
          isLiveRef.current = false;
          liveClockRef.current = null;
          setLoadState("preparing");
        });
        return;
      }

      // Countdown UI only when opening with ?mode=scheduled and start is still in the future.
      if (mode === "scheduled" && modeOverride !== "start") {
        const next = await getNextScheduledSession();
        if (loadTokenRef.current !== token) return;
        if (next?.scheduled_at) {
          const startMs = Date.parse(next.scheduled_at);
          const nowIso = await getServerNowIso();
          if (loadTokenRef.current !== token) return;
          const nowMs = nowIso ? Date.parse(nowIso) : Date.now();
          const remaining = Math.max(0, startMs - nowMs);
          if (remaining > 0) {
            safeSet(() => {
              countdownTargetRef.current = startMs;
              setCountdownMs(remaining);
              setWaitingSession(next);
              setBundle(null);
              setMediaReady(false);
              isLiveRef.current = false;
              liveClockRef.current = null;
              setLoadState("countdown");
            });
            return;
          }
        }
        // Start time passed or no upcoming row — resolve live session below.
      }

      const session = await resolveCampfirePlaybackSession(waitingId);
      if (loadTokenRef.current !== token) return;
      if (!session) {
        safeSet(() => setLoadState("empty"));
        return;
      }

      let preloadedImages = false;
      let data: CampfireSessionBundle | null = null;
      if (session.status === "live") {
        const cached =
          getCampfireLivePreload(session.id) ??
          (await waitForCampfireLivePreload(session.id));
        if (cached) {
          data = cached.bundle;
          preloadedImages = cached.imagesReady;
        }
      }
      if (!data) {
        data = await getCampfireSessionBundle(session.id);
      }
      if (loadTokenRef.current !== token) return;
      if (!data) {
        safeSet(() => setLoadState("error"));
        return;
      }

      safeSet(() => {
        setBundle(data);
        if (preloadedImages || preloadedWhileWaiting) setMediaReady(true);
        setWaitingSession(null);
      });

      // Live sessions should start "in progress" for late joiners.
      if (session.status === "live" && session.live_started_at) {
        const serverNowIso = await getServerNowIso();
        if (loadTokenRef.current !== token) return;
        const serverNowMs = serverNowIso ? Date.parse(serverNowIso) : Date.now();
        safeSet(() => {
          serverSkewMsRef.current = serverNowMs - Date.now();
          const startedMs = Date.parse(session.live_started_at!);
          const elapsed = Math.max(0, serverNowMs - startedMs);
          const d = Math.max(1, session.duration ?? sessionDurationMs(data));
          const playhead = Math.min(elapsed, d);
          liveClockRef.current = {
            deviceStartMs: Date.now(),
            playheadStartMs: playhead,
            durationMs: d,
          };
          isLiveRef.current = true;
          setCurrentTimeMs(playhead);
        });
      } else {
        safeSet(() => {
          liveClockRef.current = null;
          isLiveRef.current = false;
          setCurrentTimeMs(0);
        });
      }

      safeSet(() => setLoadState("preparing"));
    },
    [params.mode]
  );

  // Reload each time the screen is opened (hidden tab may stay mounted after finish).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void loadCampfire();

      return () => {
        cancelled = true;
        if (cancelled) loadTokenRef.current++;
        countdownTargetRef.current = null;
        waitingSessionRef.current = null;
        setWaitingSession(null);
        if (liveResyncTimerRef.current) {
          clearInterval(liveResyncTimerRef.current);
          liveResyncTimerRef.current = null;
        }
        if (liveChannelRef.current) {
          supabase.removeChannel(liveChannelRef.current);
          liveChannelRef.current = null;
        }
        // Ensure no audio keeps playing when leaving the tab/screen.
        setIsPlaying(false);
        setLoadState("loading");
        setBundle(null);
        setCurrentTimeMs(0);
        setMediaReady(false);
        invalidateCampfireLivePreload();
      };
    }, [loadCampfire])
  );

  // Countdown ticker for scheduled session flow.
  useEffect(() => {
    if (loadState !== "countdown") return;
    const timer = setInterval(async () => {
      const target = countdownTargetRef.current;
      if (!target) return;
      const nowIso = await getServerNowIso();
      const nowMs = nowIso ? Date.parse(nowIso) : Date.now();
      const remaining = Math.max(0, target - nowMs);
      setCountdownMs(remaining);
      if (remaining <= 0) {
        countdownTargetRef.current = null;
        // Bypass ?mode=scheduled so we don't re-query "future only" and show empty.
        void loadCampfire("start");
      }
    }, 500);
    return () => clearInterval(timer);
  }, [loadState, loadCampfire]);

  // Preload session media in the background during the final 30s on the wait screen.
  useEffect(() => {
    if (loadState !== "countdown" || !waitingSession) return;
    if (countdownMs > CAMPFIRE_PRELOAD_LEAD_MS) return;

    const sessionId = waitingSession.id;
    startCampfireSessionPreload(sessionId);

    let cancelled = false;
    const applyPreload = async () => {
      const hit =
        getCampfireLivePreload(sessionId) ??
        (await waitForCampfireLivePreload(sessionId));
      if (cancelled || !hit) return;
      setBundle(hit.bundle);
      setMediaReady(true);
    };

    void applyPreload();
    const poll = setInterval(() => {
      void applyPreload();
    }, 800);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [loadState, waitingSession, countdownMs]);

  // 2. Prefetch images before reveal (audio loads in useCampfireAudio).
  useEffect(() => {
    if (loadState !== "preparing" || !bundle) return;
    if (mediaReady) return;
    let cancelled = false;
    void prepareCampfireMedia(bundle).then(() => {
      if (!cancelled) setMediaReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loadState, bundle, mediaReady]);

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
        // Live playback derives time from the shared clock, not accumulated deltas.
        if (isLiveRef.current && liveClockRef.current) {
          const { deviceStartMs, playheadStartMs, durationMs: liveDuration } =
            liveClockRef.current;
          const next = playheadStartMs + (now - deviceStartMs);
          if (liveDuration <= 0) return 0;
          if (next >= liveDuration) {
            setIsPlaying(false);
            return liveDuration;
          }
          return next;
        }

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

  // Live drift correction + realtime channel hookup.
  useEffect(() => {
    if (loadState !== "ready" || !bundle) return;
    if (!isLiveRef.current || !bundle.session.live_started_at) return;

    // Realtime channel for future interactions (reactions, etc.).
    const channel = supabase.channel(`campfire:${bundle.session.id}`, {
      config: { private: true, broadcast: { self: true } },
    });
    channel.on("broadcast", { event: "reaction" }, ({ payload }) => {
      const emoji = typeof payload?.emoji === "string" ? payload.emoji : "🔥";
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setReactionBursts((prev) => [
        ...prev,
        { id, emoji, createdAtMs: Date.now() },
      ]);
    });

    const updateViewerCount = () => {
      const state = channel.presenceState() as PresenceState;
      setViewerCount(Object.keys(state).length);
    };

    channel
      .on("presence", { event: "sync" }, updateViewerCount)
      .on("presence", { event: "join" }, updateViewerCount)
      .on("presence", { event: "leave" }, updateViewerCount);

    channel.subscribe();
    liveChannelRef.current = channel;

    // Track presence (viewer count). Only for authenticated users.
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      // Set a stable presence key based on user id.
      channel.updateJoinPayload({
        config: {
          private: true,
          broadcast: { self: true },
          presence: { key: data.user.id },
        },
      });
      // Track a small payload (kept minimal; presence is not for high-frequency updates).
      try {
        await channel.track({ online_at: new Date().toISOString() });
      } catch {
        // Presence is best-effort.
      }
    });

    // Periodically resync with server time to keep playhead accurate.
    liveResyncTimerRef.current = setInterval(async () => {
      if (!bundle.session.live_started_at) return;
      const serverNowIso = await getServerNowIso();
      if (!serverNowIso) return;

      const serverNowMs = Date.parse(serverNowIso);
      serverSkewMsRef.current = serverNowMs - Date.now();
      const startedMs = Date.parse(bundle.session.live_started_at);
      const elapsed = Math.max(0, serverNowMs - startedMs);
      const d =
        liveClockRef.current?.durationMs ??
        Math.max(1, bundle.session.duration ?? durationMs);
      const expected = Math.min(elapsed, d);

      // If we're off by more than ~300ms, snap.
      setCurrentTimeMs((current) => {
        const diff = Math.abs(current - expected);
        if (diff > 300) {
          liveClockRef.current = {
            deviceStartMs: Date.now(),
            playheadStartMs: expected,
            durationMs: d,
          };
          return expected;
        }
        return current;
      });
    }, 15000);

    return () => {
      if (liveResyncTimerRef.current) {
        clearInterval(liveResyncTimerRef.current);
        liveResyncTimerRef.current = null;
      }
      if (liveChannelRef.current) {
        supabase.removeChannel(liveChannelRef.current);
        liveChannelRef.current = null;
      }
      setViewerCount(0);
    };
  }, [loadState, bundle, durationMs]);

  // Return to the home tab when playback reaches the end.
  useEffect(() => {
    if (loadState !== "ready" || !finished || hasExitedAfterFinishRef.current) {
      return;
    }
    hasExitedAfterFinishRef.current = true;
    setIsPlaying(false);
    router.replace("/(tabs)");
  }, [loadState, finished]);

  useCampfireAudio(
    bundle?.components ?? [],
    currentTimeMs,
    isPlaying,
    loadState === "ready"
  );

  const togglePlay = useCallback(() => {
    if (finished) return;
    setIsPlaying((p) => !p);
  }, [finished]);

  const handleClose = useCallback(() => {
    setIsPlaying(false);
    router.replace("/(tabs)");
  }, []);

  const showSpinner = loadState === "loading" || loadState === "preparing";
  const countdownParts = useMemo(
    () => formatCountdown(countdownMs),
    [countdownMs]
  );

  const sendReaction = useCallback(
    async (emoji: string) => {
      if (!isLiveRef.current || !bundle || !liveChannelRef.current) return;
      const playheadMs = currentTimeMs;
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) throw new Error("not_authenticated");
        const { error } = await supabase.from("campfire_reactions").insert({
          session_id: bundle.session.id,
          emoji,
          playhead_ms: Math.round(playheadMs),
        });
        if (error) throw error;
      } catch (e) {
        // Best-effort fallback (e.g. if user isn't authed yet).
        try {
          await liveChannelRef.current.send({
            type: "broadcast",
            event: "reaction",
            payload: { emoji, at: new Date().toISOString(), playhead_ms: Math.round(playheadMs) },
          });
        } catch {
          void e;
        }
      }
    },
    [bundle, currentTimeMs]
  );

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

            {isLiveRef.current && (
              <>
                <ReactionOverlay
                  bursts={reactionBursts}
                  onPrune={(ids) => {
                    if (ids.length === 0) return;
                    setReactionBursts((prev) => prev.filter((b) => !ids.includes(b.id)));
                  }}
                  width={width}
                  height={height}
                />
                <SafeAreaView
                  pointerEvents="box-none"
                  style={styles.liveControls}
                >
                  <View style={styles.viewerPill}>
                    <View style={styles.viewerDot} />
                    <ThemedText style={styles.viewerText}>
                      {viewerCount}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => void sendReaction("🔥")}
                    style={styles.reactionButton}
                    hitSlop={12}
                  >
                    <MaterialIcons
                      name="local-fire-department"
                      size={scaleW(22)}
                      color="#FFF"
                    />
                  </Pressable>
                </SafeAreaView>
              </>
            )}
          </Pressable>
        )}

        {loadState === "countdown" && (
          <View style={styles.centerFill}>
            <View style={styles.countdownCard}>
              <ThemedText
                type="heading"
                style={{
                  fontSize: scaleW(18),
                  fontWeight: "900",
                  color: "#3B1A06",
                  textAlign: "center",
                }}
              >
                Weekly Campfire
              </ThemedText>
              <ThemedText
                style={{
                  marginTop: scaleW(6),
                  fontSize: scaleW(13),
                  fontWeight: "700",
                  color: "#6B3D1A",
                  textAlign: "center",
                }}
              >
                Starts in
              </ThemedText>

              <View
                style={{
                  marginTop: scaleW(14),
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: scaleW(10),
                }}
              >
                {[
                  { v: countdownParts.hrs, label: "HRS" },
                  { v: countdownParts.mins, label: "MINS" },
                  { v: countdownParts.secs, label: "SECS" },
                ].map((b) => (
                  <View key={b.label} style={styles.countdownBox}>
                    <ThemedText
                      style={{
                        fontSize: scaleW(22),
                        fontWeight: "900",
                        color: "#3B1A06",
                      }}
                    >
                      {String(b.v).padStart(2, "0")}
                    </ThemedText>
                    <ThemedText
                      style={{
                        marginTop: scaleW(2),
                        fontSize: scaleW(10),
                        fontWeight: "900",
                        color: "#6B3D1A",
                      }}
                    >
                      {b.label}
                    </ThemedText>
                  </View>
                ))}
              </View>

              <ThemedText
                style={{
                  marginTop: scaleW(14),
                  fontSize: scaleW(12),
                  fontWeight: "700",
                  color: "#3B1A06",
                  textAlign: "center",
                }}
              >
                {countdownMs <= CAMPFIRE_PRELOAD_LEAD_MS
                  ? "Getting everything ready…"
                  : "We'll start automatically when it begins."}
              </ThemedText>
            </View>
          </View>
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

        {/* Paused hint */}
        {loadState === "ready" && !isPlaying && !finished && (
          <View style={styles.centerFill} pointerEvents="none">
            <View style={styles.playBadge}>
              <MaterialIcons
                name="play-arrow"
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
  countdownCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 22,
    marginHorizontal: 34,
    alignItems: "center",
    maxWidth: 340,
  },
  countdownBox: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 62,
    alignItems: "center",
    justifyContent: "center",
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
  liveControls: {
    position: "absolute",
    right: 14,
    bottom: 14,
    alignItems: "center",
    gap: 10,
  },
  viewerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(24, 24, 27, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  viewerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  viewerText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(24, 24, 27, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
});

function ReactionOverlay({
  bursts,
  onPrune,
  width,
  height,
}: {
  bursts: ReactionBurst[];
  onPrune: (ids: string[]) => void;
  width: number;
  height: number;
}) {
  // prune bursts older than 2s
  useEffect(() => {
    if (bursts.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      const expired = bursts.filter((b) => now - b.createdAtMs > 2000).map((b) => b.id);
      onPrune(expired);
    }, 500);
    return () => clearInterval(timer);
  }, [bursts, onPrune]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bursts.map((b, idx) => (
        <FloatingEmoji
          key={b.id}
          emoji={b.emoji}
          seed={idx}
          width={width}
          height={height}
        />
      ))}
    </View>
  );
}

function FloatingEmoji({
  emoji,
  seed,
  width,
  height,
}: {
  emoji: string;
  seed: number;
  width: number;
  height: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 1800,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const x = useMemo(() => {
    const base = width * 0.72;
    const spread = Math.min(90, width * 0.18);
    const r = ((seed * 2654435761) % 1000) / 1000;
    return base + (r - 0.5) * spread;
  }, [seed, width]);

  const y0 = height * 0.78;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -140],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 1, 0],
  });
  const scale = anim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.9, 1, 1.05],
  });

  return (
    <Animated.Text
      style={{
        position: "absolute",
        left: x,
        top: y0,
        fontSize: 26,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}
