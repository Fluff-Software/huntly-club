import { useState, useEffect, useCallback } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { getTotalXpForProfileIds } from "@/services/teamActivityService";

/**
 * Stats for the current profile (selected player):
 * - daysPlayed: days since the profile was created (profile.created_at)
 * - pointsEarned: total XP from user_achievements for this profile only
 * When no profile is selected, both are 0.
 */
export function useUserStats(): { daysPlayed: number; pointsEarned: number; refetch: () => Promise<void> } {
  const { currentPlayer } = usePlayer();
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

  const refetch = useCallback(async () => {
    if (currentPlayer?.id != null) {
      try {
        const points = await getTotalXpForProfileIds([currentPlayer.id]);
        setPointsEarned(points);
      } catch {
        setPointsEarned(0);
      }
    } else {
      setPointsEarned(0);
    }
  }, [currentPlayer?.id]);

  useEffect(() => {
    if (currentPlayer?.id != null) {
      getTotalXpForProfileIds([currentPlayer.id])
        .then(setPointsEarned)
        .catch(() => setPointsEarned(0));
    } else {
      setPointsEarned(0);
    }
  }, [currentPlayer?.id]);

  return { daysPlayed, pointsEarned, refetch };
}
