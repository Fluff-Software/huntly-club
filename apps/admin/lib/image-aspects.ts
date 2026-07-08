import type { CSSProperties } from "react";

/** Reference phone width (logical pts) — keep in sync with `apps/mobile/hooks/useLayoutScale.ts`. */
const REFERENCE_WIDTH = 390;

/** Horizontal padding on mission step / detail screens (`scaleW(20)` each side). */
const MISSION_MEDIA_PADDING = 20;

/** Fixed media height on mission step and detail screens (`scaleW(220)`). */
const MISSION_MEDIA_HEIGHT = 220;

/**
 * Aspect ratio for mission step images and full-width mission hero images in the app.
 * Matches `(REFERENCE_WIDTH - 2×padding) / height` with `resizeMode="cover"`.
 */
export const MISSION_MEDIA_ASPECT =
  (REFERENCE_WIDTH - MISSION_MEDIA_PADDING * 2) / MISSION_MEDIA_HEIGHT;

/** Story slide images are cropped landscape for the full-screen slide viewer. */
export const STORY_SLIDE_ASPECT = 16 / 9;

/** Season / chapter hero uploads (wide landscape). */
export const SEASON_HERO_ASPECT = 16 / 9;

/** Approved club photos — square cards on Clubhouse and Campfire (`scaleW(250)` × `scaleW(250)`). */
export const PHOTO_REVIEW_ASPECT = 1;

export function imageAspectStyle(aspect: number): CSSProperties {
  return { aspectRatio: aspect };
}

export function getAssetPreviewAspect(entityType: string, slotKey: string | null): number {
  if (entityType === "activity" && slotKey === "cover") return MISSION_MEDIA_ASPECT;
  if (entityType === "mission_step") return MISSION_MEDIA_ASPECT;
  if (entityType === "story_slide") return STORY_SLIDE_ASPECT;
  return SEASON_HERO_ASPECT;
}
