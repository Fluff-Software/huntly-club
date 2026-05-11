import { useEffect, useState } from "react";
import {
  type ActiveTrackingSession,
  getActiveTrackingSession,
  subscribeActiveTrackingSession,
} from "@/services/trackingSessionService";

export function useActiveTrackingSession() {
  const [session, setSession] = useState<ActiveTrackingSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getActiveTrackingSession()
      .then((activeSession) => {
        if (!cancelled) setSession(activeSession);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const unsubscribe = subscribeActiveTrackingSession((activeSession) => {
      setSession(activeSession);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return { session, loading };
}
