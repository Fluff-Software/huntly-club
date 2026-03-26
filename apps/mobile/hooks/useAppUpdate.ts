import { useEffect } from "react";
import * as Updates from "expo-updates";

/**
 * Checks for an EAS Update on launch. If one is available, fetches and reloads.
 * Only runs in non-development builds (no-ops in Expo Go / dev client).
 */
export function useAppUpdate(): void {
  useEffect(() => {
    if (__DEV__) return;

    const checkAndApply = async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Silently ignore — network errors, etc. App continues with cached bundle.
      }
    };

    void checkAndApply();
  }, []);
}
