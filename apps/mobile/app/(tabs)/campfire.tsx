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
import { useIsFocused } from "@react-navigation/native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { CampfireStage } from "@/components/campfire/CampfireStage";
import { useCampfireAudio } from "@/components/campfire/useCampfireAudio";
import { useCampfireVideoPlayers } from "@/components/campfire/useCampfireVideoPlayers";
import { prepareCampfireMedia } from "@/components/campfire/prepareCampfireMedia";
import {
  dismissCampfireLiveSession,
  getCampfireSessionBundle,
  getCampfireSessionById,
  getLatestLiveSession,
  getLatestReplaySession,
  getNextScheduledSession,
  getServerNowIso,
  resolveCampfirePlaybackSession,
  sessionDurationMs,
  type CampfireSessionBundle,
  type CampfireSessionRow,
} from "@/services/campfireService";
import { useCampfireRealtime } from "@/hooks/useCampfireRealtime";
import {
  CAMPFIRE_REACTION_MIN_INTERVAL_MS,
  sendCampfireReaction,
} from "@/services/campfireReactionService";
import {
  CAMPFIRE_PRELOAD_LEAD_MS,
  getCampfireLivePreload,
  invalidateCampfireLivePreload,
  startCampfireSessionPreload,
  waitForCampfireLivePreload,
} from "@/services/campfireLivePreload";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { BackHeader } from "@/components/BackHeader";
import { CHILD_SCREEN_PADDING_W } from "@/components/ChildScreenLayout";

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
  const { user } = useAuth();
  const { profiles } = usePlayer();

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
  const isLiveRef = useRef(false);
  const [reactionBursts, setReactionBursts] = useState<ReactionBurst[]>([]);
  const [realtimeSessionId, setRealtimeSessionId] = useState<number | null>(null);
  const realtimeSessionIdRef = useRef<number | null>(null);
  const loadTokenRef = useRef(0);
  const loadStateRef = useRef<LoadState>("loading");
  const joinLiveInFlightRef = useRef(false);
  const lastReactionSentAtRef = useRef(0);

  useEffect(() => {
    waitingSessionRef.current = waitingSession;
  }, [waitingSession]);

  useEffect(() => {
    loadStateRef.current = loadState;
  }, [loadState]);

  const pinRealtimeSession = useCallback((sessionId: number) => {
    realtimeSessionIdRef.current = sessionId;
    setRealtimeSessionId(sessionId);
  }, []);

  // Keep one Realtime topic for the whole visit (wait screen → live playback).
  useEffect(() => {
    if (waitingSession?.id != null) {
      pinRealtimeSession(waitingSession.id);
    }
  }, [waitingSession?.id, pinRealtimeSession]);

  useEffect(() => {
    if (bundle?.session.status === "live" && bundle.session.id != null) {
      pinRealtimeSession(bundle.session.id);
    }
  }, [bundle?.session.id, bundle?.session.status, pinRealtimeSession]);

  const effectiveRealtimeSessionId =
    realtimeSessionId ?? realtimeSessionIdRef.current;

  const handleReactionBroadcast = useCallback((emoji: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setReactionBursts((prev) => {
      const next = [...prev, { id, emoji, createdAtMs: Date.now() }];
      return next.length > 24 ? next.slice(-24) : next;
    });
  }, []);

  const profileIds = useMemo(() => profiles.map((p) => p.id), [profiles]);

  const { viewerCount, channelRef: liveChannelRef } = useCampfireRealtime({
    sessionId: effectiveRealtimeSessionId,
    userId: user?.id,
    profileIds,
    onReaction: handleReactionBroadcast,
  });

  const loadCampfire = useCallback(
    async (modeOverride?: string) => {
      const token = ++loadTokenRef.current;
      const mode = modeOverride ?? params.mode;

      const waitingId = waitingSessionRef.current?.id;
      if (waitingId != null) {
        pinRealtimeSession(waitingId);
      }
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
        const sessionRow =
          session.status === "live"
            ? {
                ...data!.session,
                status: "live" as const,
                live_started_at:
                  session.live_started_at ??
                  data!.session.live_started_at ??
                  data!.session.scheduled_at,
              }
            : data!.session;
        setBundle({ ...data!, session: sessionRow });
        if (sessionRow.id != null) {
          pinRealtimeSession(sessionRow.id);
        }
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
    [params.mode, pinRealtimeSession]
  );

  const beginLivePlayback = useCallback(() => {
    if (joinLiveInFlightRef.current) return;
    if (loadStateRef.current !== "countdown") return;
    joinLiveInFlightRef.current = true;
    void loadCampfire("start").finally(() => {
      joinLiveInFlightRef.current = false;
    });
  }, [loadCampfire]);

  const isFocused = useIsFocused();

  const stopCampfireSession = useCallback(() => {
    loadTokenRef.current++;
    countdownTargetRef.current = null;
    waitingSessionRef.current = null;
    setWaitingSession(null);
    if (liveResyncTimerRef.current) {
      clearInterval(liveResyncTimerRef.current);
      liveResyncTimerRef.current = null;
    }
    realtimeSessionIdRef.current = null;
    setRealtimeSessionId(null);
    setReactionBursts([]);
    setIsPlaying(false);
    setLoadState("loading");
    setBundle(null);
    setCurrentTimeMs(0);
    setMediaReady(false);
    invalidateCampfireLivePreload();
  }, []);

  // Reload when opened; stop playback when user leaves (tab switch = close).
  useFocusEffect(
    useCallback(() => {
      void loadCampfire();
      return () => {
        stopCampfireSession();
      };
    }, [loadCampfire, stopCampfireSession])
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
        beginLivePlayback();
      }
    }, 500);
    return () => clearInterval(timer);
  }, [loadState, beginLivePlayback]);

  // Join live as soon as the session flips (don't wait only on local countdown).
  useEffect(() => {
    if (loadState !== "countdown" || !waitingSession) return;

    const sessionId = waitingSession.id;
    let cancelled = false;

    const checkLive = async () => {
      if (cancelled) return;
      const row = await getCampfireSessionById(sessionId);
      if (cancelled) return;
      if (row?.status === "live") {
        beginLivePlayback();
        return;
      }
      const latest = await getLatestLiveSession();
      if (cancelled) return;
      if (latest?.id === sessionId) {
        beginLivePlayback();
      }
    };

    void checkLive();

    const watchChannel = supabase
      .channel(`campfire-live-watch:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campfire_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as CampfireSessionRow;
          if (row?.status === "live") {
            beginLivePlayback();
          }
        }
      )
      .subscribe();

    const poll = setInterval(() => {
      void checkLive();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(watchChannel);
    };
  }, [loadState, waitingSession?.id, beginLivePlayback]);

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
    if (loadState !== "preparing" || !isFocused) return;
    if (mediaReady && videosReady) {
      setLoadState("ready");
      setIsPlaying(true);
    }
  }, [loadState, mediaReady, videosReady, isFocused]);

  // 3b. Safety net: never block the user indefinitely on preparing.
  useEffect(() => {
    if (loadState !== "preparing" || !isFocused) return;
    const timer = setTimeout(() => {
      if (!isFocused) return;
      setLoadState("ready");
      setIsPlaying(true);
    }, PREPARE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loadState, isFocused]);

  const playbackEnabled = isFocused && loadState === "ready";
  const transportPlaying = playbackEnabled && isPlaying;

  // Pause video immediately when the screen loses focus (tab stays mounted).
  useEffect(() => {
    if (isFocused) return;
    for (const player of videoPlayers.values()) {
      try {
        player.pause();
      } catch {
        // ignore
      }
    }
  }, [isFocused, videoPlayers]);

  // Timeline clock.
  useEffect(() => {
    if (!transportPlaying || durationMs <= 0) return;
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
  }, [transportPlaying, durationMs]);

  // Periodically resync live playhead with server time.
  useEffect(() => {
    const shouldResync =
      loadState === "ready" &&
      bundle?.session.live_started_at &&
      isLiveRef.current;

    if (!shouldResync) return;

    liveResyncTimerRef.current = setInterval(async () => {
      if (!bundle?.session.live_started_at) return;
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
    };
  }, [loadState, bundle, durationMs]);

  // Return to the home tab when playback reaches the end.
  useEffect(() => {
    if (loadState !== "ready" || !finished || hasExitedAfterFinishRef.current) {
      return;
    }
    hasExitedAfterFinishRef.current = true;
    setIsPlaying(false);
    if (bundle?.session.id != null && isLiveRef.current) {
      dismissCampfireLiveSession(bundle.session.id);
    }
    router.replace("/(tabs)");
  }, [loadState, finished, bundle?.session.id]);

  useCampfireAudio(
    bundle?.components ?? [],
    currentTimeMs,
    transportPlaying,
    playbackEnabled
  );

  const isLivePlayback =
    loadState === "ready" &&
    (bundle?.session.status === "live" || isLiveRef.current);

  const showLiveInteractions =
    effectiveRealtimeSessionId != null &&
    (loadState === "countdown" ||
      loadState === "loading" ||
      loadState === "preparing" ||
      (loadState === "ready" &&
        (isLiveRef.current || bundle?.session.status === "live")));

  const togglePlay = useCallback(() => {
    if (finished || isLiveRef.current) return;
    setIsPlaying((p) => !p);
  }, [finished]);

  const showSpinner = loadState === "loading" || loadState === "preparing";
  const countdownParts = useMemo(
    () => formatCountdown(countdownMs),
    [countdownMs]
  );

  const sendReaction = useCallback(
    async (emoji: string) => {
      if (!effectiveRealtimeSessionId || !liveChannelRef.current || !user) {
        return;
      }
      const now = Date.now();
      if (now - lastReactionSentAtRef.current < CAMPFIRE_REACTION_MIN_INTERVAL_MS) {
        return;
      }
      const playheadMs =
        loadState === "countdown" || loadState === "preparing"
          ? 0
          : currentTimeMs;
      const sent = await sendCampfireReaction(
        liveChannelRef.current,
        effectiveRealtimeSessionId,
        emoji,
        playheadMs
      );
      if (sent) {
        lastReactionSentAtRef.current = now;
      }
    },
    [effectiveRealtimeSessionId, currentTimeMs, loadState, user]
  );

  const liveInteractionChrome = (
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
      <SafeAreaView pointerEvents="box-none" style={styles.liveControls}>
        <View style={styles.viewerPill}>
          <View style={styles.viewerDot} />
          <ThemedText style={styles.viewerText}>{viewerCount}</ThemedText>
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
  );

  return (
    <View style={styles.container}>
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <View style={styles.overlay} />

        {loadState === "ready" && bundle && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={isLivePlayback ? undefined : togglePlay}
            disabled={isLivePlayback}
          >
            <CampfireStage
              width={width}
              height={height}
              scaleW={scaleW}
              currentTimeMs={currentTimeMs}
              isPlaying={transportPlaying}
              tracks={bundle.tracks}
              components={bundle.components}
              activities={bundle.activities}
              captains={bundle.captains}
              approvedPhotos={bundle.approvedPhotos}
              videoPlayers={videoPlayers}
            />

            {showLiveInteractions && liveInteractionChrome}
          </Pressable>
        )}

        {loadState === "countdown" && (
          <View style={styles.centerFill}>
            {showLiveInteractions && liveInteractionChrome}
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
            {showLiveInteractions && (
              <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {liveInteractionChrome}
              </View>
            )}
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

        {/* Paused hint (replay only; live follows the shared clock) */}
        {loadState === "ready" && !isPlaying && !finished && !isLivePlayback && (
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

        <SafeAreaView
          style={[styles.controls, { paddingHorizontal: scaleW(CHILD_SCREEN_PADDING_W) }]}
          edges={["top"]}
          pointerEvents="box-none"
        >
          <BackHeader variant="dark" onBack={stopCampfireSession} />
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
