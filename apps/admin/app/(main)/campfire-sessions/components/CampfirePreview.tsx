"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useCampfirePreviewAudio } from "../lib/use-campfire-preview-audio";
import { useCampfirePreviewVideo } from "../lib/use-campfire-preview-video";
import { getCampfireCaptainImageUrl } from "@/lib/captains";
import type {
  ActivityOption,
  ApprovedPhotoOption,
  CampfireComponentRow,
  CampfireTrackRow,
  CaptainOption,
} from "../types";

const FONT_JUA = "var(--font-jua), sans-serif";
const FONT_COMIC_NEUE = "var(--font-comic-neue), sans-serif";

/** Must match the mobile app's REFERENCE_WIDTH in useLayoutScale.ts */
const MOBILE_REFERENCE_WIDTH = 390;

function getCaptainPreviewImage(captain: CaptainOption): string | null {
  const slug = captain.slug?.toLowerCase();
  if (slug) {
    const campUrl = getCampfireCaptainImageUrl(slug);
    if (campUrl) return campUrl;
  }
  return captain.avatar_url ?? null;
}

type Props = {
  currentTimeMs: number;
  isPlaying: boolean;
  tracks: CampfireTrackRow[];
  components: CampfireComponentRow[];
  activities: ActivityOption[];
  captains: CaptainOption[];
  approvedPhotos: ApprovedPhotoOption[];
};

function isActive(comp: CampfireComponentRow, t: number): boolean {
  return t >= comp.start_time && t < comp.start_time + comp.duration;
}

const FADE_DURATION_MS = 400;

/** Returns 0..1 opacity based on how far into the block the playhead is, with fade-in/out. */
function componentOpacity(comp: CampfireComponentRow, t: number): number {
  if (t < comp.start_time || t >= comp.start_time + comp.duration) return 0;
  const elapsed = t - comp.start_time;
  const remaining = comp.start_time + comp.duration - t;
  const fadeIn = Math.min(1, elapsed / FADE_DURATION_MS);
  const fadeOut = Math.min(1, remaining / FADE_DURATION_MS);
  return Math.min(fadeIn, fadeOut);
}

const SLIDE_DURATION_MS = 500;

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

/** Tolerance for considering two subtitle blocks "connected" (touching or overlapping). */
const CONNECTED_TOLERANCE_MS = 50;

/**
 * For subtitle blocks: compute separate background and text opacities.
 * Both background and text skip the fade on edges connected to another subtitle.
 */
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
    (s) =>
      s.id !== current.id &&
      Math.abs(s.start_time + s.duration - current.start_time) <= CONNECTED_TOLERANCE_MS
  );
  const hasNeighborAfter = allSubtitles.some(
    (s) =>
      s.id !== current.id &&
      Math.abs(s.start_time - end) <= CONNECTED_TOLERANCE_MS
  );

  const fadeIn = hasNeighborBefore ? 1 : rawFadeIn;
  const fadeOut = hasNeighborAfter ? 1 : rawFadeOut;
  const bgOpacity = Math.min(fadeIn, fadeOut);
  const textOpacity = Math.min(fadeIn, fadeOut);

  return { bgOpacity, textOpacity };
}

const CLUB_CARD_AUTHOR_COLORS = [
  "#D4A05A",
  "#8B7BA8",
  "#7A9B76",
  "#5B8A9E",
  "#C97B6C",
];

export function CampfirePreview({
  currentTimeMs,
  isPlaying,
  tracks,
  components,
  activities,
  captains,
  approvedPhotos,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const [phoneWidth, setPhoneWidth] = useState(0);

  useEffect(() => {
    const el = phoneRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setPhoneWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const s = useCallback(
    (n: number) => Math.round((phoneWidth / MOBILE_REFERENCE_WIDTH) * n),
    [phoneWidth]
  );

  useCampfirePreviewAudio(audioRef, components, currentTimeMs, isPlaying);
  const setVideoRef = useCampfirePreviewVideo(components, currentTimeMs, isPlaying);

  const layerZ = useCallback(
    (comp: CampfireComponentRow) => {
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
    subtitle && typeof (subtitle.data as { text?: string }).text === "string"
      ? (subtitle.data as { text: string }).text
      : null;

  const captainData = captainComp?.data as {
    captainId?: number;
    captainSlug?: string;
  } | undefined;

  const captain =
    captainData?.captainId != null
      ? captains.find((c) => c.id === captainData.captainId)
      : captainData?.captainSlug
        ? captains.find((c) => c.slug === captainData.captainSlug)
        : null;

  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-orange-950/20 p-2">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} className="hidden" preload="auto" />
      <div ref={phoneRef} className="relative isolate h-full max-h-full w-auto max-w-full aspect-[9/16] overflow-hidden rounded-2xl border-2 border-orange-400/40 shadow-xl">
        <Image
          src="/campfire-bg.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vh"
          priority
        />

        {phoneWidth > 0 && activeMissionCards.map((mc) => {
          const aId = (mc.data as { activityId?: number }).activityId;
          const mission = aId ? activities.find((a) => a.id === aId) : null;
          if (!mission) return null;
          const { opacity, translateX, rotate } = slideTransform(
            mc,
            currentTimeMs,
            phoneWidth
          );
          const borderW = Math.max(3, s(6));
          return (
            <div
              key={mc.id}
              className="absolute left-1/2"
              style={{
                top: s(60),
                width: s(270),
                height: s(370),
                opacity,
                transform: `translateX(calc(-50% + ${translateX}px)) rotate(${rotate}deg)`,
                transition: "none",
                zIndex: layerZ(mc) + 1,
              }}
            >
              {/* inner */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#FFF",
                  borderRadius: s(24),
                  padding: s(12),
                  borderWidth: borderW,
                  borderStyle: "solid",
                  borderColor: "#7FAF8A",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* imageWrap */}
                <div
                  style={{
                    width: "100%",
                    height: s(160),
                    borderRadius: s(14),
                    overflow: "hidden",
                    backgroundColor: "#1a1a2e",
                    marginBottom: s(12),
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  {mission.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mission.image}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: s(13), fontWeight: 600, color: "rgba(255,255,255,0.5)", fontFamily: FONT_COMIC_NEUE }}>
                        No image
                      </span>
                    </div>
                  )}
                </div>
                {/* titleRow */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: s(8),
                    gap: s(8),
                  }}
                >
                  {/* title */}
                  <span
                    style={{
                      fontSize: s(18),
                      fontWeight: 400,
                      textAlign: "center",
                      color: "#000",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      fontFamily: FONT_JUA,
                    }}
                  >
                    {mission.title}
                  </span>
                  {/* pointsBadge */}
                  {mission.xp != null && (
                    <span
                      style={{
                        backgroundColor: "#F5F0E8",
                        paddingLeft: s(10),
                        paddingRight: s(10),
                        paddingTop: s(6),
                        paddingBottom: s(6),
                        borderRadius: s(12),
                        border: "1px solid #E5E7EB",
                        fontSize: s(13),
                        fontWeight: 700,
                        color: "#374151",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        fontFamily: FONT_COMIC_NEUE,
                      }}
                    >
                      {mission.xp} Points
                    </span>
                  )}
                </div>
                {/* description */}
                <p
                  style={{
                    fontSize: s(15),
                    fontWeight: 400,
                    lineHeight: `${s(20)}px`,
                    marginTop: 0,
                    marginBottom: s(16),
                    marginLeft: s(8),
                    marginRight: s(8),
                    textAlign: "center",
                    color: "#000",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical" as const,
                    textOverflow: "ellipsis",
                    flexShrink: 1,
                    fontFamily: FONT_COMIC_NEUE,
                  }}
                >
                  {mission.description ?? ""}
                </p>
                {/* startButton */}
                <div
                  style={{
                    backgroundColor: "#7FAF8A",
                    borderRadius: s(24),
                    paddingTop: s(12),
                    paddingBottom: s(12),
                    marginLeft: s(24),
                    marginRight: s(24),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: s(16),
                      fontWeight: 400,
                      color: "#FFF",
                      fontFamily: FONT_JUA,
                    }}
                  >
                    Start
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {phoneWidth > 0 && activeSubmissions.map((sub) => {
          const pId = (sub.data as { photoId?: number }).photoId;
          const photo = pId ? approvedPhotos.find((p) => p.photo_id === pId) : null;
          if (!photo) return null;
          const { opacity, translateX, rotate } = slideTransform(
            sub,
            currentTimeMs,
            phoneWidth
          );
          const authorColor = CLUB_CARD_AUTHOR_COLORS[
            (photo.photo_id ?? 0) % CLUB_CARD_AUTHOR_COLORS.length
          ];
          return (
            <div
              key={sub.id}
              className="absolute left-1/2"
              style={{
                top: s(80),
                width: s(250),
                opacity,
                transform: `translateX(calc(-50% + ${translateX}px)) rotate(${rotate}deg)`,
                transition: "none",
                zIndex: layerZ(sub) + 1,
              }}
            >
              <div
                style={{
                  width: s(250),
                  height: s(250),
                  borderRadius: s(16),
                  overflow: "hidden",
                  border: "2px solid #FFF",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  position: "relative",
                  backgroundColor: "#E0E0E0",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.photo_url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                {photo.activity_title && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: s(40),
                      left: s(10),
                      fontSize: s(18),
                      fontWeight: 400,
                      backgroundColor: "#FFF",
                      borderRadius: s(20),
                      paddingLeft: s(5),
                      paddingRight: s(5),
                      color: "#1a1a1a",
                      lineHeight: 1.3,
                      fontFamily: FONT_JUA,
                    }}
                  >
                    {photo.activity_title}
                  </span>
                )}
                {photo.nickname && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: s(10),
                      left: s(10),
                      fontSize: s(16),
                      fontWeight: 400,
                      backgroundColor: authorColor,
                      color: "#FFF",
                      borderRadius: s(20),
                      paddingLeft: s(5),
                      paddingRight: s(5),
                      lineHeight: 1.3,
                      fontFamily: FONT_JUA,
                    }}
                  >
                    by {photo.nickname}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {phoneWidth > 0 && activeVideos.map((vc) => {
          const vData = vc.data as {
            videoUrl?: string;
            displayMode?: string;
            videoRatio?: string;
            maximize?: string;
          };
          if (!vData.videoUrl) return null;
          const { opacity, translateX, rotate } = slideTransform(vc, currentTimeMs, phoneWidth);
          const isFullscreen = vData.displayMode === "fullscreen";
          const ratio = vData.videoRatio || "original";
          const maximize = (vData.maximize === "width" || vData.maximize === "height")
            ? (vData.maximize as "width" | "height")
            : "height";
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
          return (
            <div
              key={vc.id}
              className={isFullscreen ? "absolute inset-0" : "absolute left-1/2"}
              style={isFullscreen ? {
                opacity,
                transition: "none",
                zIndex: layerZ(vc) + 1,
              } : {
                top: s(80),
                width: cardW,
                opacity,
                transform: `translateX(calc(-50% + ${translateX}px)) rotate(${rotate}deg)`,
                transition: "none",
                zIndex: layerZ(vc) + 1,
              }}
            >
              {isFullscreen ? (
                <div
                  className="h-full w-full"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#000",
                  }}
                >
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    ref={(el) => setVideoRef(vc.id, el)}
                    src={vData.videoUrl}
                    playsInline
                    style={{
                      ...(maximize === "width"
                        ? { width: "100%", height: "auto", maxHeight: "none" }
                        : { height: "100%", width: "auto", maxWidth: "none" }),
                      display: "block",
                    }}
                  />
                </div>
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  ref={(el) => setVideoRef(vc.id, el)}
                  src={vData.videoUrl}
                  playsInline
                  style={{
                    width: cardW,
                    ...(ratio !== "original" ? { height: cardH } : {}),
                    borderRadius: s(16),
                    objectFit: ratio === "original" ? "contain" : "cover",
                    display: "block",
                    border: "2px solid #FFF",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  }}
                />
              )}
            </div>
          );
        })}

        {(() => {
          const captainOpacity = captainComp ? componentOpacity(captainComp, currentTimeMs) : 0;
          const subOpacities = subtitle
            ? subtitleOpacities(subtitle, allSubtitles, currentTimeMs)
            : null;
          const bgOpacity = Math.max(subOpacities?.bgOpacity ?? 0, captainOpacity);
          const textOpacity = subOpacities?.textOpacity ?? 0;

          return bgOpacity > 0 ? (
            <div
              className="absolute bottom-0 left-0 right-0 z-[31] bg-black/50 px-3 py-2.5 backdrop-blur-sm"
              style={{ opacity: bgOpacity, transition: "none" }}
            >
              <p
                className="text-center text-base font-medium leading-snug text-white drop-shadow-sm"
                style={{
                  opacity: subtitleText ? (bgOpacity > 0 ? textOpacity / bgOpacity : 0) : 0,
                  transition: "none",
                  fontFamily: FONT_COMIC_NEUE,
                }}
              >
                {subtitleText || "\u00A0"}
              </p>
            </div>
          ) : null;
        })()}

        {captain && captainComp && (() => {
          const imgSrc = getCaptainPreviewImage(captain);
          if (!imgSrc) return null;
          const opacity = componentOpacity(captainComp, currentTimeMs);
          return (
            <div
              className="absolute bottom-8 left-1/2 z-[30] w-[55%] -translate-x-1/2"
              style={{ opacity, transition: "none" }}
            >
              <Image
                src={imgSrc}
                alt={captain.name}
                width={400}
                height={400}
                className="h-auto w-full object-contain object-bottom"
                unoptimized={imgSrc.startsWith("http")}
              />
            </div>
          );
        })()}
      </div>
    </div>
  );
}
