import * as NavigationBar from "expo-navigation-bar";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

/** Hides the Android system navigation bar (Back / Home / Recents). No-op on iOS. */
export function useHideAndroidNavigationBar() {
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const hide = () => NavigationBar.setVisibilityAsync("hidden");

    void hide();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void hide();
    });

    return () => subscription.remove();
  }, []);
}
