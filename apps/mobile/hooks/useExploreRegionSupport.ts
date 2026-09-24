import { useEffect, useState } from "react";
import { getLastKnownCoordsIfPermitted } from "@/services/exploreWarmup";
import { isCoordinateInSupportedRegion } from "@/constants/exploreSupportedRegions";

/**
 * Whether the Explore feature should be shown to this user, based on a passive
 * (non-prompting) last-known location falling inside an activated coverage region.
 * Fails closed: hidden while loading, on denied/unavailable permission, or outside coverage.
 */
export function useExploreRegionSupport(): { isSupported: boolean; isLoading: boolean } {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getLastKnownCoordsIfPermitted()
      .then((coords) => {
        if (cancelled) return;
        setIsSupported(coords != null && isCoordinateInSupportedRegion(coords.latitude, coords.longitude));
      })
      .catch(() => {
        if (!cancelled) setIsSupported(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { isSupported, isLoading };
}
