import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import type { VideoPlayer } from "expo-video";
import type {
  ActivityOption,
  ApprovedPhotoOption,
  CampfireComponentRow,
  CampfireTrackRow,
  CaptainComponentData,
  CaptainOption,
  MissionCardComponentData,
  SubmissionComponentData,
  SubtitleComponentData,
  VideoComponentData,
} from "@/services/campfireService";
import { CampfireVideo } from "./CampfireVideo";

const FONT_JUA = "Jua_400Regular";
const FONT_BODY = "ComicNeue_400Regular";
const FONT_BODY_BOLD = "ComicNeue_700Bold";

const CAPTAIN_IMAGES: Record<string, ReturnType<typeof require>> = {
  oli: require("@/assets/images/oli-standing.png"),
  bella: require("@/assets/images/bella-standing.png"),
  felix: require("@/assets/images/felix-standing.png"),
};

const CLUB_CARD_AUTHOR_COLORS = [
  "#D4A05A",
  "#8B7BA8",
  "#7A9B76",
  "#5B8A9E",
  "#C97B6C",
];

const FADE_DURATION_MS = 400;
const SLIDE_DURATION_MS = 500;
const CONNECTED_TOLERANCE_MS = 50;

function isActive(comp: CampfireComponentRow, t: number): boolean {
  return t >= comp.start_time && t < comp.start_time + comp.duration;
}

function componentOpacity(comp: CampfireComponentRow, t: number): number {
  if (t < comp.start_time || t >= comp.start_time + comp.duration) return 0;
  const elapsed = t - comp.start_time;
  const remaining = comp.start_time + comp.duration - t;
  const fadeIn = Math.min(1, elapsed / FADE_DURATION_MS);
  const fadeOut = Math.min(1, remaining / FADE_DURATION_MS);
  return Math.min(fadeIn, fadeOut);
}

function easeOutBack(t: number): number {
  const c1 = 1.3;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

function slideTransform(
  comp: CampfireComponentRow,
  t: number,
  containerWidth: number
): { opacity: number; translateX: number; rotate: number } {
  if (t < comp.start_time || t >= comp.start_time + comp.duration) {
    return { opacity: 0, translateX: containerWidth, rotate: 10 };
  }
  const elapsed = t - comp.start_time;
  const remaining = comp.start_time + comp.duration - t;

  if (elapsed < SLIDE_DURATION_MS) {
    const progress = elapsed / SLIDE_DURATION_MS;
    const eased = easeOutBack(progress);
    return {
      opacity: Math.min(1, elapsed / 150),
      translateX: (1 - eased) * containerWidth * 0.8,
      rotate: (1 - eased) * 10,
    };
  }
  if (remaining < SLIDE_DURATION_MS) {
    const progress = 1 - remaining / SLIDE_DURATION_MS;
    const eased = easeInCubic(progress);
    return {
      opacity: 1 - eased * eased,
      translateX: -eased * containerWidth * 0.8,
      rotate: -eased * 10,
    };
  }
  return { opacity: 1, translateX: 0, rotate: 0 };
}

function subtitleOpacities(
  current: CampfireComponentRow,
  allSubtitles: CampfireComponentRow[],
  t: number
): { bgOpacity: number; textOpacity: number } {
  if (t < current.start_time || t >= current.start_time + current.duration)
    return { bgOpacity: 0, textOpacity: 0 };

  const elapsed = t - current.start_time;
  const remaining = current.start_time + current.duration - t;
  const rawFadeIn = Math.min(1, elapsed / FADE_DURATION_MS);
  const rawFadeOut = Math.min(1, remaining / FADE_DURATION_MS);

  const end = current.start_time + current.duration;
  const hasNeighborBefore = allSubtitles.some(
    (sb) =>
      sb.id !== current.id &&
      Math.abs(sb.start_time + sb.duration - current.start_time) <=
        CONNECTED_TOLERANCE_MS
  );
  const hasNeighborAfter = allSubtitles.some(
    (sb) =>
      sb.id !== current.id &&
      Math.abs(sb.start_time - end) <= CONNECTED_TOLERANCE_MS
  );

  const fadeIn = hasNeighborBefore ? 1 : rawFadeIn;
  const fadeOut = hasNeighborAfter ? 1 : rawFadeOut;
  return {
    bgOpacity: Math.min(fadeIn, fadeOut),
    textOpacity: Math.min(fadeIn, fadeOut),
  };
}

function resolveCaptainImage(captain: CaptainOption) {
  const slug = captain.slug?.toLowerCase();
  if (slug && CAPTAIN_IMAGES[slug]) return CAPTAIN_IMAGES[slug];
  if (captain.avatar_url) return { uri: captain.avatar_url };
  return null;
}

type Props = {
  width: number;
  height: number;
  scaleW: (n: number) => number;
  currentTimeMs: number;
  isPlaying: boolean;
  tracks: CampfireTrackRow[];
  components: CampfireComponentRow[];
  activities: ActivityOption[];
  captains: CaptainOption[];
  approvedPhotos: ApprovedPhotoOption[];
  videoPlayers: Map<number, VideoPlayer>;
};

export function CampfireStage({
  width,
  scaleW: s,
  currentTimeMs,
  isPlaying,
  tracks,
  components,
  activities,
  captains,
  approvedPhotos,
  videoPlayers,
}: Props) {
  const layerZ = useMemo(
    () => (comp: CampfireComponentRow) => {
      const idx = tracks.findIndex((t) => t.id === comp.track_id);
      return idx === -1 ? 0 : tracks.length - idx;
    },
    [tracks]
  );

  const allSubtitles = components.filter((c) => c.type === "subtitle");
  const active = components.filter((c) => isActive(c, currentTimeMs));

  const subtitle = active.find((c) => c.type === "subtitle");
  const captainComp = active.find((c) => c.type === "captain");
  const activeMissionCards = active.filter((c) => c.type === "mission_card");
  const activeSubmissions = active.filter((c) => c.type === "submission");
  const activeVideos = active.filter((c) => c.type === "video");

  const subtitleText =
    subtitle && typeof (subtitle.data as SubtitleComponentData).text === "string"
      ? (subtitle.data as SubtitleComponentData).text ?? null
      : null;

  const captainData = captainComp?.data as CaptainComponentData | undefined;
  const captain =
    captainData?.captainId != null
      ? captains.find((c) => c.id === captainData.captainId) ?? null
      : captainData?.captainSlug
        ? captains.find((c) => c.slug === captainData.captainSlug) ?? null
        : null;

  const captainOpacity = captainComp
    ? componentOpacity(captainComp, currentTimeMs)
    : 0;
  const subOpacities = subtitle
    ? subtitleOpacities(subtitle, allSubtitles, currentTimeMs)
    : null;
  const bgOpacity = Math.max(subOpacities?.bgOpacity ?? 0, captainOpacity);
  const textOpacity = subOpacities?.textOpacity ?? 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Mission cards */}
      {activeMissionCards.map((mc) => {
        const aId = (mc.data as MissionCardComponentData).activityId;
        const mission = aId ? activities.find((a) => a.id === aId) : null;
        if (!mission) return null;
        const { opacity, translateX, rotate } = slideTransform(
          mc,
          currentTimeMs,
          width
        );
        const cardW = s(270);
        return (
          <View
            key={mc.id}
            style={{
              position: "absolute",
              top: s(60),
              left: 0,
              right: 0,
              alignItems: "center",
              zIndex: layerZ(mc) + 1,
            }}
          >
            <View
              style={{
                width: cardW,
                height: s(370),
                opacity,
                transform: [{ translateX }, { rotate: `${rotate}deg` }],
                backgroundColor: "#FFF",
                borderRadius: s(24),
                padding: s(12),
                borderWidth: Math.max(3, s(6)),
                borderColor: "#7FAF8A",
                shadowColor: "#000",
                shadowOpacity: 0.3,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: "100%",
                  height: s(160),
                  borderRadius: s(14),
                  overflow: "hidden",
                  backgroundColor: "#1a1a2e",
                  marginBottom: s(12),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {mission.image ? (
                  <ExpoImage
                    source={{ uri: mission.image }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Text
                    style={{
                      fontSize: s(13),
                      color: "rgba(255,255,255,0.5)",
                      fontFamily: FONT_BODY,
                    }}
                  >
                    No image
                  </Text>
                )}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: s(8),
                  gap: s(8),
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: s(18),
                    textAlign: "center",
                    color: "#000",
                    flex: 1,
                    fontFamily: FONT_JUA,
                  }}
                >
                  {mission.title}
                </Text>
                {mission.xp != null && (
                  <Text
                    style={{
                      backgroundColor: "#F5F0E8",
                      paddingHorizontal: s(10),
                      paddingVertical: s(6),
                      borderRadius: s(12),
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      fontSize: s(13),
                      color: "#374151",
                      fontFamily: FONT_BODY_BOLD,
                      overflow: "hidden",
                    }}
                  >
                    {mission.xp} Points
                  </Text>
                )}
              </View>

              <Text
                numberOfLines={2}
                style={{
                  fontSize: s(15),
                  lineHeight: s(20),
                  marginBottom: s(16),
                  marginHorizontal: s(8),
                  textAlign: "center",
                  color: "#000",
                  fontFamily: FONT_BODY,
                }}
              >
                {mission.description ?? ""}
              </Text>

              <View
                style={{
                  backgroundColor: "#7FAF8A",
                  borderRadius: s(24),
                  paddingVertical: s(12),
                  marginHorizontal: s(24),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: s(16), color: "#FFF", fontFamily: FONT_JUA }}>
                  Start
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* Submissions */}
      {activeSubmissions.map((sub) => {
        const pId = (sub.data as SubmissionComponentData).photoId;
        const photo = pId
          ? approvedPhotos.find((p) => p.photo_id === pId)
          : null;
        if (!photo) return null;
        const { opacity, translateX, rotate } = slideTransform(
          sub,
          currentTimeMs,
          width
        );
        const authorColor =
          CLUB_CARD_AUTHOR_COLORS[
            (photo.photo_id ?? 0) % CLUB_CARD_AUTHOR_COLORS.length
          ];
        const sizeW = s(250);
        return (
          <View
            key={sub.id}
            style={{
              position: "absolute",
              top: s(80),
              left: 0,
              right: 0,
              alignItems: "center",
              zIndex: layerZ(sub) + 1,
            }}
          >
            <View
              style={{
                width: sizeW,
                height: sizeW,
                opacity,
                transform: [{ translateX }, { rotate: `${rotate}deg` }],
                borderRadius: s(16),
                overflow: "hidden",
                borderWidth: 2,
                borderColor: "#FFF",
                backgroundColor: "#E0E0E0",
                shadowColor: "#000",
                shadowOpacity: 0.3,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
              }}
            >
              <ExpoImage
                source={{ uri: photo.photo_url }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              {photo.activity_title && (
                <Text
                  style={{
                    position: "absolute",
                    bottom: s(40),
                    left: s(10),
                    fontSize: s(18),
                    backgroundColor: "#FFF",
                    borderRadius: s(20),
                    paddingHorizontal: s(5),
                    color: "#1a1a1a",
                    fontFamily: FONT_JUA,
                    overflow: "hidden",
                  }}
                >
                  {photo.activity_title}
                </Text>
              )}
              {photo.nickname && (
                <Text
                  style={{
                    position: "absolute",
                    bottom: s(10),
                    left: s(10),
                    fontSize: s(16),
                    backgroundColor: authorColor,
                    color: "#FFF",
                    borderRadius: s(20),
                    paddingHorizontal: s(5),
                    fontFamily: FONT_JUA,
                    overflow: "hidden",
                  }}
                >
                  by {photo.nickname}
                </Text>
              )}
            </View>
          </View>
        );
      })}

      {/* Videos */}
      {activeVideos.map((vc) => {
        const vData = vc.data as VideoComponentData;
        if (!vData.videoUrl) return null;
        const player = videoPlayers.get(vc.id);
        if (!player) return null;
        const { opacity, translateX, rotate } = slideTransform(
          vc,
          currentTimeMs,
          width
        );
        const offsetSec = Math.max(0, (currentTimeMs - vc.start_time) / 1000);
        const isFullscreen = vData.displayMode === "fullscreen";
        const ratio = vData.videoRatio || "original";
        const sizeMap: Record<string, number> = {
          square: 300,
          landscape: 300,
          portrait: 200,
          original: 300,
        };
        const cardW = s(sizeMap[ratio] ?? 300);
        const aspectMap: Record<string, number | undefined> = {
          square: 1,
          landscape: 9 / 16,
          portrait: 16 / 9,
          original: undefined,
        };
        const aspect = aspectMap[ratio];
        const cardH = aspect ? cardW * aspect : cardW;

        if (isFullscreen) {
          return (
            <View
              key={vc.id}
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity,
                  backgroundColor: "#000",
                  zIndex: layerZ(vc) + 1,
                },
              ]}
            >
              <CampfireVideo
                player={player}
                offsetSec={offsetSec}
                isPlaying={isPlaying}
                style={{ flex: 1 }}
                contentFit="contain"
              />
            </View>
          );
        }

        return (
          <View
            key={vc.id}
            style={{
              position: "absolute",
              top: s(80),
              left: 0,
              right: 0,
              alignItems: "center",
              zIndex: layerZ(vc) + 1,
            }}
          >
            <View
              style={{
                width: cardW,
                height: cardH,
                opacity,
                transform: [{ translateX }, { rotate: `${rotate}deg` }],
                borderRadius: s(16),
                overflow: "hidden",
                borderWidth: 2,
                borderColor: "#FFF",
                shadowColor: "#000",
                shadowOpacity: 0.3,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
              }}
            >
              <CampfireVideo
                player={player}
                offsetSec={offsetSec}
                isPlaying={isPlaying}
                style={{ width: "100%", height: "100%" }}
                contentFit={ratio === "original" ? "contain" : "cover"}
              />
            </View>
          </View>
        );
      })}

      {/* Subtitle bar */}
      {bgOpacity > 0 && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 31,
            backgroundColor: "rgba(0,0,0,0.5)",
            paddingHorizontal: s(12),
            paddingVertical: s(10),
            opacity: bgOpacity,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontSize: s(16),
              lineHeight: s(20),
              color: "#FFF",
              fontFamily: FONT_BODY,
              opacity: subtitleText && bgOpacity > 0 ? textOpacity / bgOpacity : 0,
            }}
          >
            {subtitleText || "\u00A0"}
          </Text>
        </View>
      )}

      {/* Captain */}
      {captain &&
        captainComp &&
        (() => {
          const imgSrc = resolveCaptainImage(captain);
          if (!imgSrc) return null;
          return (
            <View
              style={{
                position: "absolute",
                bottom: s(32),
                left: 0,
                right: 0,
                alignItems: "center",
                zIndex: 30,
                opacity: captainOpacity,
              }}
            >
              <ExpoImage
                source={imgSrc}
                style={{ width: width * 0.55, height: width * 0.55 }}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>
          );
        })()}
    </View>
  );
}
