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
