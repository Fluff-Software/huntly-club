import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { type AdventurePlan, getAdventurePlan } from "@/services/adventurePlanService";
import { guideForTeam, syncAdventureReminders } from "@/services/adventureReminderService";

/**
 * The family's booked adventure slot. Re-syncs local reminders whenever it loads,
 * so a reinstall or a change made on another device is picked up.
 */
export function useAdventurePlan(teamName: string | null | undefined) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<AdventurePlan | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user?.id) {
      setPlan(null);
      setLoading(false);
      return null;
    }
    const next = await getAdventurePlan(user.id);
    setPlan(next);
    setLoading(false);
    void syncAdventureReminders(next, guideForTeam(teamName));
    return next;
  }, [user?.id, teamName]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { plan, loading, refetch, setPlan };
}
