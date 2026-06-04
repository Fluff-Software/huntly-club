import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as SplashScreen from "expo-splash-screen";
import { useAuth } from "@/contexts/AuthContext";
import { useSegments } from "expo-router";

type HomeBootstrapContextValue = {
  /** Hold splash / full-screen loader until clubhouse activity tiles finish first load. */
  clubhouseActivityRequired: boolean;
  clubhouseActivityReady: boolean;
  requireClubhouseActivityReady: () => void;
  markClubhouseActivityReady: () => void;
};

const HomeBootstrapContext = createContext<HomeBootstrapContextValue | null>(null);

export function HomeBootstrapProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [clubhouseActivityRequired, setClubhouseActivityRequired] = useState(false);
  const [clubhouseActivityReady, setClubhouseActivityReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setClubhouseActivityRequired(false);
      setClubhouseActivityReady(false);
    }
  }, [user]);

  const requireClubhouseActivityReady = useCallback(() => {
    setClubhouseActivityRequired(true);
  }, []);

  const markClubhouseActivityReady = useCallback(() => {
    setClubhouseActivityReady(true);
  }, []);

  const value = useMemo(
    () => ({
      clubhouseActivityRequired,
      clubhouseActivityReady,
      requireClubhouseActivityReady,
      markClubhouseActivityReady,
    }),
    [
      clubhouseActivityRequired,
      clubhouseActivityReady,
      requireClubhouseActivityReady,
      markClubhouseActivityReady,
    ]
  );

  return (
    <HomeBootstrapContext.Provider value={value}>
      {children}
    </HomeBootstrapContext.Provider>
  );
}

export function useHomeBootstrap() {
  const ctx = useContext(HomeBootstrapContext);
  if (!ctx) {
    throw new Error("useHomeBootstrap must be used within HomeBootstrapProvider");
  }
  return ctx;
}

export function useHomeBootstrapOptional() {
  return useContext(HomeBootstrapContext);
}

/**
 * Keeps the native splash visible until fonts load and (when needed) clubhouse
 * activity tiles have finished their initial preload.
 */
export function SplashScreenGate({ fontsReady }: { fontsReady: boolean }) {
  const ctx = useHomeBootstrapOptional();
  const { user } = useAuth();
  const segments = useSegments();
  const onTabs = segments[0] === "(tabs)";

  useEffect(() => {
    if (!fontsReady) return;
    const waitingForClubhouse =
      !!user &&
      onTabs &&
      !!ctx?.clubhouseActivityRequired &&
      !ctx.clubhouseActivityReady;
    if (!waitingForClubhouse) {
      void SplashScreen.hideAsync();
    }
  }, [
    fontsReady,
    user,
    onTabs,
    ctx?.clubhouseActivityRequired,
    ctx?.clubhouseActivityReady,
  ]);

  return null;
}
