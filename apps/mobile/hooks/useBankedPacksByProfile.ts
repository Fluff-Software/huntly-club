/**
 * Loads unopened Explore packs for every household profile. Shared between
 * the Card Binder's badge and the Pack Inventory screen so a pack opened on
 * either stays in sync with the other on next refresh/focus.
 */
import { useCallback, useEffect, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { getBankedPacks } from "@/services/exploreStopsService";
import type { ExplorePackRecord } from "@/types/exploreStops";

export function useBankedPacksByProfile() {
  const { profiles } = usePlayer();
  const [bankedPacksByProfile, setBankedPacksByProfile] = useState<
    Map<number, ExplorePackRecord[]>
  >(new Map());

  const refresh = useCallback(async () => {
    if (profiles.length === 0) {
      setBankedPacksByProfile(new Map());
      return;
    }
    try {
      const entries = await Promise.all(
        profiles.map(async (p) => [p.id, await getBankedPacks(p.id)] as const)
      );
      setBankedPacksByProfile(new Map(entries));
    } catch {
      // Best-effort -- callers just won't see this refresh reflected.
    }
  }, [profiles]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { bankedPacksByProfile, refresh };
}
