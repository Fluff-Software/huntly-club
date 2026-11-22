import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { type Guide, GUIDES } from "@/constants/guides";
import { teamKeyFromName, type TeamKey } from "@/constants/fieldKit";
import { useUser } from "@/contexts/UserContext";

const KEY = "huntly.lastTeam.v1";
// Read once per launch so screens after the first get the team synchronously.
let cachedTeam: TeamKey | null | undefined;
const cacheReady: Promise<void> = AsyncStorage.getItem(KEY)
  .then((v) => {
    cachedTeam = (v as TeamKey | null) ?? null;
  })
  .catch(() => {
    cachedTeam = null;
  });

const byKey = (k: TeamKey | null | undefined) => (k ? GUIDES.find((g) => g.team === k) ?? null : null);

/**
 * The family's guide, or null until we actually know their team. Unlike
 * `guideForTeamName`, this never falls back to Bears, so screens can show a
 * neutral loading state instead of flashing the wrong team. The last known team
 * is remembered on the device so returning families see theirs straight away.
 */
export function useTeamGuide(): { guide: Guide | null; loading: boolean } {
  const { team, loading } = useUser();
  const live = teamKeyFromName(team?.name);
  const [cached, setCached] = useState<TeamKey | null | undefined>(cachedTeam);

  useEffect(() => {
    if (cached !== undefined) return;
    void cacheReady.then(() => setCached(cachedTeam ?? null));
  }, [cached]);

  useEffect(() => {
    if (!live || live === cachedTeam) return;
    cachedTeam = live;
    setCached(live);
    void AsyncStorage.setItem(KEY, live).catch(() => undefined);
  }, [live]);

  // A loaded user with a different team wins over the cache (e.g. after switching team).
  const guide = live ? byKey(live) : loading ? byKey(cached) : null;
  return { guide, loading: !guide && (loading || cached === undefined) };
}
