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

type HomeBootstrapContextValue = {
  /** Index screen blocks interaction until clubhouse activity tiles finish first load. */
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
 * Hides the native splash once fonts are ready. Clubhouse tile preload uses the
 * in-app index background instead of holding the green splash screen.
 */
export function SplashScreenGate({ fontsReady }: { fontsReady: boolean }) {
  useEffect(() => {
    if (!fontsReady) return;
    void SplashScreen.hideAsync();
  }, [fontsReady]);

  return null;
}
