/**
 * Background Explore tile warm-up.
 * Only runs when foreground location permission is already granted — never prompts.
 * Fire-and-forget: preparing / errors are ignored.
 */
import * as Location from "expo-location";
import { getExploreStopsNear } from "@/services/exploreStopsService";
import { resolveExploreTransport } from "@/utils/exploreApiConfig";

const WARM_RADIUS_METRES = 500;

let warmedThisSession = false;
let inFlight = false;

/** Reset when the user signs out so a later sign-in can warm again. */
export function resetExploreAreaWarmup(): void {
  warmedThisSession = false;
  inFlight = false;
}

/**
 * Passive location lookup: only returns coords if foreground permission is
 * already granted. Never prompts. Used to warm Explore tiles and to decide
 * whether the Explore entry points should be shown for the user's region.
 */
export async function getLastKnownCoordsIfPermitted(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    return null;
  }

  const last = await Location.getLastKnownPositionAsync();
  if (last?.coords) {
    return { latitude: last.coords.latitude, longitude: last.coords.longitude };
  }

  try {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: current.coords.latitude, longitude: current.coords.longitude };
  } catch {
    return null;
  }
}

/**
 * If location permission is already granted, request nearby stops once to
 * start OSM tile preparation for the user's current area.
 */
export async function warmExploreAreaIfPermitted(): Promise<void> {
  if (warmedThisSession || inFlight) return;
  inFlight = true;

  try {
    const coords = await getLastKnownCoordsIfPermitted();
    if (!coords) return;
    const { latitude, longitude } = coords;

    // Mark before the network call so a slow prepare does not stack warmups.
    warmedThisSession = true;

    if (__DEV__) {
      console.log(
        `[explore-warmup] transport=${resolveExploreTransport()} ` +
          `${latitude.toFixed(4)},${longitude.toFixed(4)} r=${WARM_RADIUS_METRES}`
      );
    }

    await getExploreStopsNear({
      latitude,
      longitude,
      radiusMetres: WARM_RADIUS_METRES,
    });
  } catch {
    // Intentionally ignore: map_data_preparing / rate limits / offline are fine.
    // warmedThisSession stays true so we do not hammer on every tab focus.
  } finally {
    inFlight = false;
  }
}
