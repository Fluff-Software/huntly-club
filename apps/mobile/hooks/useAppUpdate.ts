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
        if (!result.isAvailable) return;

        // If the fetch takes too long the user is likely already past the splash screen —
        // skip the update this session rather than reloading mid-use.
        await Promise.race([
          Updates.fetchUpdateAsync(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 8000)
          ),
        ]);

        await Updates.reloadAsync();
      } catch {
        // Silently ignore — network errors, timeout, etc. App continues with cached bundle.
      }
    };

    void checkAndApply();
  }, []);
}
