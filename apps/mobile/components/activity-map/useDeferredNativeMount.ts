import { useEffect, useState } from "react";
import { InteractionManager } from "react-native";

/** Extra settle time after interactions so stack transitions fully finish. */
const POST_INTERACTION_SETTLE_MS = 80;

/**
 * Delay mounting heavy native views (maps) until after navigation /
 * layout animations finish. Prevents a New Architecture deadlock where
 * JS registers a LegacyViewManagerInterop component while the main
 * thread is mid-animated-props update on the same ComponentDescriptorRegistry.
 */
export function useDeferredNativeMount(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const handle = InteractionManager.runAfterInteractions(() => {
      settleTimer = setTimeout(() => {
        if (!cancelled) setReady(true);
      }, POST_INTERACTION_SETTLE_MS);
    });

    return () => {
      cancelled = true;
      handle.cancel();
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, []);

  return ready;
}
