/**
 * MapTiler + MapLibre (Android walk/cycle maps).
 * @see https://docs.maptiler.com/react-native/
 * @see apps/mobile/.env.example — account setup and key restrictions
 */

/** Default style for activity maps (trails, parks, footpaths). Override via EXPO_PUBLIC_MAPTILER_STYLE_ID. */
export const DEFAULT_MAPTILER_STYLE_ID = "openstreetmap";

export function getMapTilerStyleId(): string {
  return process.env.EXPO_PUBLIC_MAPTILER_STYLE_ID?.trim() || DEFAULT_MAPTILER_STYLE_ID;
}

export function getMapTilerApiKey(): string | undefined {
  const key = process.env.EXPO_PUBLIC_MAPTILER_API_KEY?.trim();
  return key || undefined;
}

/** MapLibre `mapStyle` URL for ActivityMap on Android. */
export function getMapTilerMapStyleUrl(): string | undefined {
  const key = getMapTilerApiKey();
  if (!key) return undefined;
  return `https://api.maptiler.com/maps/${getMapTilerStyleId()}/style.json?key=${key}`;
}
