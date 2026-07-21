import { useEffect, useState } from "react";
import {
  type ActiveHuntSession,
  getActiveHuntSession,
  subscribeActiveHuntSession,
} from "@/services/activeHuntSessionService";

export function useActiveHuntSession() {
  const [session, setSession] = useState<ActiveHuntSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getActiveHuntSession()
      .then((activeSession) => {
        if (!cancelled) setSession(activeSession);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const unsubscribe = subscribeActiveHuntSession((activeSession) => {
      setSession(activeSession);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return { session, loading };
}
