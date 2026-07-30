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
 * If location permission is already granted, request nearby stops once to
 * start OSM tile preparation for the user's current area.
 */
export async function warmExploreAreaIfPermitted(): Promise<void> {
  if (warmedThisSession || inFlight) return;
  inFlight = true;

  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      return;
    }

    let latitude: number | null = null;
    let longitude: number | null = null;

    const last = await Location.getLastKnownPositionAsync();
    if (last?.coords) {
      latitude = last.coords.latitude;
      longitude = last.coords.longitude;
    } else {
      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        latitude = current.coords.latitude;
        longitude = current.coords.longitude;
      } catch {
        return;
      }
    }

    if (latitude == null || longitude == null) return;

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
