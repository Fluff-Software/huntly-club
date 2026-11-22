import { useCallback } from "react";
import { CommonActions } from "@react-navigation/native";
import { useNavigationContainerRef } from "expo-router";

/**
 * Land on the tabs with nothing underneath. `router.replace` only swaps the top
 * screen, so the welcome/sign-up/auth screens stayed in the root stack and
 * Android's back button walked back into them instead of leaving the app.
 */
export function useResetToTabs() {
  const navigationRef = useNavigationContainerRef();
  return useCallback(() => {
    if (!navigationRef.isReady()) return false;
    navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "(tabs)" }] }));
    return true;
  }, [navigationRef]);
}
