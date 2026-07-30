import type { ExploreReviewFlag, ExploreStop } from "@/types/exploreStops";

/** Marker colours aligned with scripts/explore review-map.html */
export const EXPLORE_MARKER = {
  accepted: "#1f9d55",
  low: "#f08c00",
  water: "#1c7ed6",
  school: "#ae3ec9",
  barrier: "#e8590c",
  edge: "#868e96",
  claimed: "#495057",
  user: "#E03131",
} as const;

export function exploreStopMarkerColor(stop: ExploreStop, claimed = false): string {
  if (claimed) return EXPLORE_MARKER.claimed;
  const flags = new Set(stop.reviewFlags);
  if (flags.has("near_bbox_edge")) return EXPLORE_MARKER.edge;
  if (
    flags.has("near_gate") ||
    flags.has("near_fence") ||
    flags.has("barrier_access_uncertain")
  ) {
    return EXPLORE_MARKER.barrier;
  }
  if (
    flags.has("near_school") ||
    flags.has("public_path_near_school") ||
    flags.has("school_boundary_uncertain")
  ) {
    return EXPLORE_MARKER.school;
  }
  if (
    flags.has("near_water") ||
    flags.has("path_beside_water") ||
    flags.has("mapped_public_waterside_route") ||
    flags.has("water_edge_uncertain")
  ) {
    return EXPLORE_MARKER.water;
  }
  if (flags.has("low_confidence") || stop.confidence < 0.75) return EXPLORE_MARKER.low;
  return EXPLORE_MARKER.accepted;
}

export function stopHasReviewFlags(stop: ExploreStop): boolean {
  return stop.reviewFlags.some(
    (f) =>
      f === "near_water" ||
      f === "path_beside_water" ||
      f === "mapped_public_waterside_route" ||
      f === "water_edge_uncertain" ||
      f === "near_school" ||
      f === "public_path_near_school" ||
      f === "school_boundary_uncertain" ||
      f === "near_gate" ||
      f === "near_fence" ||
      f === "barrier_access_uncertain" ||
      f === "near_bbox_edge" ||
      f === "near_major_road"
  );
}

export function isLowConfidenceStop(stop: ExploreStop): boolean {
  return stop.reviewFlags.includes("low_confidence" as ExploreReviewFlag) || stop.confidence < 0.75;
}

/** Approximate centre of the Sneyd Green / Mornington Road test box. */
export const EXPLORE_TEST_AREA_CENTRE = {
  latitude: 53.044236,
  longitude: -2.165567,
};

/** DEV GPS presets — convenience only; API receives coordinates, never preset names. */
export const EXPLORE_DEV_GPS_PRESETS = {
  sneyd_green: {
    label: "Sneyd Green",
    latitude: 53.044236,
    longitude: -2.165567,
  },
  bristol: {
    label: "Bristol",
    latitude: 51.4545,
    longitude: -2.5879,
  },
  /** Metro Manila (Rizal Park) — on land with dense OSM; not the geographic sea centre. */
  philippines: {
    label: "Manila",
    latitude: 14.582,
    longitude: 120.9794,
  },
} as const;

export type ExploreDevGpsPresetId = keyof typeof EXPLORE_DEV_GPS_PRESETS;

export const EXPLORE_MOVE_THRESHOLD_METRES = 100;

/** Must match scripts/explore CLAIM_RADIUS_METRES — hide collect until this close. */
export const EXPLORE_CLAIM_RADIUS_METRES = 50;

/** Default Explore map span (~neighbourhood). Also the maximum zoom-out. */
export const EXPLORE_MAP_DEFAULT_DELTA = 0.02;

/** Debounce after map settle before fetching nearby points for the new centre. */
export const EXPLORE_MAP_FETCH_DEBOUNCE_MS = 150;

/** Match Edge/local nearby max radius (`DEFAULT_MAX_RADIUS_METRES`). */
export const EXPLORE_MAP_MAX_RADIUS_METRES = 2000;

/** Floor when deriving radius from a tightly zoomed viewport. */
export const EXPLORE_MAP_MIN_RADIUS_METRES = 500;

/** Drop merged pins farther than this from the latest map fetch centre. */
export const EXPLORE_MAP_KEEP_METRES = 3500;
