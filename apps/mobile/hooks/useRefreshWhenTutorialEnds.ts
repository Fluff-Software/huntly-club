import { useEffect, useRef } from "react";
import { useTutorialActive } from "@/hooks/useTutorialActive";

/** Runs `refresh` once when the post-sign-up tutorial finishes. */
export function useRefreshWhenTutorialEnds(refresh: () => void | Promise<void>) {
  const isTutorialActive = useTutorialActive();
  const wasActiveRef = useRef(isTutorialActive);

  useEffect(() => {
    if (wasActiveRef.current && !isTutorialActive) {
      void refresh();
    }
    wasActiveRef.current = isTutorialActive;
  }, [isTutorialActive, refresh]);
}
