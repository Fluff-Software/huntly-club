import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import type { VideoPlayer } from "expo-video";
import {
  getCampfireCaptainImageUrl,
  type ActivityOption,
  type ApprovedPhotoOption,
  type CampfireComponentRow,
  type CampfireTrackRow,
  type CaptainComponentData,
  type CaptainOption,
  type MissionCardComponentData,
  type SubmissionComponentData,
  type SubtitleComponentData,
  type VideoComponentData,
} from "@/services/campfireService";
import { CampfireVideo } from "./CampfireVideo";
import { CampfireFullscreenVideo } from "./CampfireFullscreenVideo";
import { CampfireOriginalVideoCard } from "./CampfireOriginalVideoCard";
import { getVideoCardLayout } from "./campfireVideoLayout";

const FONT_JUA = "Jua_400Regular";
const FONT_BODY = "ComicNeue_400Regular";
const FONT_BODY_BOLD = "ComicNeue_700Bold";

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

function topLayerComponent(
  comps: CampfireComponentRow[],
  layerZ: (c: CampfireComponentRow) => number
): CampfireComponentRow | undefined {
  if (comps.length === 0) return undefined;
  return comps.reduce((best, c) => (layerZ(c) > layerZ(best) ? c : best));
}

function resolveCaptainForComponent(
  comp: CampfireComponentRow,
  captains: CaptainOption[]
): CaptainOption | null {
  const data = comp.data as CaptainComponentData;
  if (data.captainId != null) {
    return captains.find((c) => c.id === data.captainId) ?? null;
  }
  if (data.captainSlug) {
    return captains.find((c) => c.slug === data.captainSlug) ?? null;
  }
  return null;
}

function captainPositionStyle(
  alignment: NonNullable<CaptainComponentData["alignment"]>,
  stageWidth: number
): {
  left?: number;
  right?: number;
  width: number;
} {
  const w = stageWidth * 0.4125;
  if (alignment === "left") return { left: 0, width: w };
  if (alignment === "right") return { right: 0, width: w };
  return { left: (stageWidth - w) / 2, width: w };
}

function resolveCaptainImage(captain: CaptainOption) {
  const slug = captain.slug?.toLowerCase();
  if (slug) {
    const campUrl = getCampfireCaptainImageUrl(slug);
    if (campUrl) return { uri: campUrl };
  }
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
  height,
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

  const activeSubtitles = active.filter((c) => c.type === "subtitle");
  const subtitle = topLayerComponent(activeSubtitles, layerZ);
  const activeCaptains = active
    .filter((c) => c.type === "captain")
    .sort((a, b) => layerZ(a) - layerZ(b));
  const activeMissionCards = active.filter((c) => c.type === "mission_card");
  const activeSubmissions = active.filter((c) => c.type === "submission");
  const activeVideos = active.filter((c) => c.type === "video");

  const subtitleText =
    subtitle && typeof (subtitle.data as SubtitleComponentData).text === "string"
      ? (subtitle.data as SubtitleComponentData).text ?? null
      : null;

  const maxCaptainOpacity = activeCaptains.reduce(
    (max, c) => Math.max(max, componentOpacity(c, currentTimeMs)),
    0
  );
  const subOpacities = subtitle
    ? subtitleOpacities(subtitle, allSubtitles, currentTimeMs)
    : null;
  const bgOpacity = Math.max(subOpacities?.bgOpacity ?? 0, maxCaptainOpacity);
  const textOpacity = subOpacities?.textOpacity ?? 0;
  const showFooter = bgOpacity > 0 || maxCaptainOpacity > 0;

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
        const slide = slideTransform(vc, currentTimeMs, width);
        const offsetSec = Math.max(0, (currentTimeMs - vc.start_time) / 1000);
        const z = layerZ(vc) + 1;

        if (vData.displayMode === "fullscreen") {
          return (
            <CampfireFullscreenVideo
              key={vc.id}
              player={player}
              vData={vData}
              stageWidth={width}
              stageHeight={height}
              slide={slide}
              zIndex={z}
              offsetSec={offsetSec}
              isPlaying={isPlaying}
            />
          );
        }

        const layout = getVideoCardLayout(vData, s, slide, z);

        if (layout.usesIntrinsicSize) {
          return (
            <CampfireOriginalVideoCard
              key={vc.id}
              player={player}
              cardW={layout.cardW}
              scale={s}
              slide={slide}
              zIndex={z}
              offsetSec={offsetSec}
              isPlaying={isPlaying}
            />
          );
        }

        return (
          <View key={vc.id} style={layout.outerStyle}>
            <View style={layout.innerStyle!}>
              <CampfireVideo
                player={player}
                offsetSec={offsetSec}
                isPlaying={isPlaying}
                style={layout.videoStyle}
                contentFit={layout.contentFit}
              />
            </View>
          </View>
        );
      })}

      {/* Captain + subtitle footer (matches admin preview stacking) */}
      {showFooter && (
        <View style={styles.footer}>
          <View
            style={[styles.captainLayer, { minHeight: width * 0.36 }]}
            pointerEvents="none"
          >
            {activeCaptains.map((captainComp) => {
              const captain = resolveCaptainForComponent(captainComp, captains);
              if (!captain) return null;
              const imageSource = resolveCaptainImage(captain);
              if (!imageSource) return null;
              const opacity = componentOpacity(captainComp, currentTimeMs);
              if (opacity <= 0) return null;
              const alignment =
                (captainComp.data as CaptainComponentData).alignment ?? "middle";
              const position = captainPositionStyle(alignment, width);
              const contentPosition =
                alignment === "left"
                  ? "bottom left"
                  : alignment === "right"
                    ? "bottom right"
                    : "bottom";
              return (
                <View
                  key={captainComp.id}
                  style={[
                    styles.captainWrap,
                    position,
                    {
                      opacity,
                      zIndex: 30 + layerZ(captainComp),
                    },
                  ]}
                >
                  <ExpoImage
                    source={imageSource}
                    style={{ width: "100%", height: width * 0.36 }}
                    contentFit="contain"
                    contentPosition={contentPosition}
                    cachePolicy="memory-disk"
                  />
                </View>
              );
            })}
          </View>
          {bgOpacity > 0 && (
            <View
              style={[
                styles.subtitleBar,
                {
                  paddingHorizontal: s(12),
                  paddingVertical: s(10),
                  opacity: bgOpacity,
                  zIndex: 50,
                },
              ]}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontSize: s(16),
                  lineHeight: s(20),
                  color: "#FFF",
                  fontFamily: FONT_BODY,
                  opacity:
                    subtitleText && bgOpacity > 0 ? textOpacity / bgOpacity : 0,
                }}
              >
                {subtitleText || "\u00A0"}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  captainLayer: {
    width: "100%",
    position: "relative",
  },
  captainWrap: {
    position: "absolute",
    bottom: 0,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  subtitleBar: {
    alignSelf: "stretch",
    zIndex: 31,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});
