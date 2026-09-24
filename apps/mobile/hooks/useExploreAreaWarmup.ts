/**
 * Once per signed-in session, warm Explore tiles if location is already allowed.
 */
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  resetExploreAreaWarmup,
  warmExploreAreaIfPermitted,
} from "@/services/exploreWarmup";

export function useExploreAreaWarmup(): void {
  const { user, session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user || !session) {
      resetExploreAreaWarmup();
      return;
    }

    const timer = setTimeout(() => {
      void warmExploreAreaIfPermitted();
    }, 2500);

    return () => clearTimeout(timer);
  }, [user, session, loading]);
}
