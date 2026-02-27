import { useState, useEffect } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { getTotalXpForProfileIds } from "@/services/teamActivityService";

/**
 * Stats for the logged-in user across all their profiles:
 * - daysPlayed: days since the current profile was created (profile.created_at)
 * - pointsEarned: total XP from user_achievements for all of the user's profiles
 * When no profile is selected, both are 0.
 */
export function useUserStats(): { daysPlayed: number; pointsEarned: number } {
  const { currentPlayer, profiles } = usePlayer();
  const [pointsEarned, setPointsEarned] = useState(0);

  const daysPlayed =
    currentPlayer?.created_at != null
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(currentPlayer.created_at).getTime()) /
              (24 * 60 * 60 * 1000)
          )
        )
      : 0;

  useEffect(() => {
    const profileIds = profiles.map((p) => p.id);
    if (profileIds.length > 0) {
      getTotalXpForProfileIds(profileIds)
        .then(setPointsEarned)
        .catch(() => setPointsEarned(0));
    } else {
      setPointsEarned(0);
    }
  }, [profiles]);

  return { daysPlayed, pointsEarned };
}
