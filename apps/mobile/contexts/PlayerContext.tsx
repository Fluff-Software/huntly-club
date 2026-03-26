import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext";
import { getProfiles, Profile } from "@/services/profileService";

type PlayerContextType = {
  profiles: Profile[];
  refreshProfiles: () => Promise<void>;
  loading: boolean;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const isMountedRef = useRef(true);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setProfiles([]);
      setLoading(false);
    }
  }, [user]);

  const fetchProfiles = useCallback(async (): Promise<void> => {
    if (!user || !isMountedRef.current || isRefreshingRef.current) {
      return;
    }

    try {
      isRefreshingRef.current = true;
      setLoading(true);
      
      const profilesData = await getProfiles(user.id);
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setProfiles(profilesData);
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error("Error fetching profiles:", error);
        // Don't clear profiles on error - keep current state
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      isRefreshingRef.current = false;
    }
  }, [user]);

  // Simplified debounced refresh without complex timeout logic
  const refreshProfiles = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    const DEBOUNCE_TIME = 2000; // 2 seconds

    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    // If enough time has passed, refresh immediately
    if (timeSinceLastRefresh >= DEBOUNCE_TIME) {
      lastRefreshTimeRef.current = now;
      await fetchProfiles();
      return;
    }

    // Otherwise, schedule a refresh
    const remainingTime = DEBOUNCE_TIME - timeSinceLastRefresh;
    refreshTimeoutRef.current = setTimeout(async () => {
      if (isMountedRef.current) {
        lastRefreshTimeRef.current = Date.now();
        await fetchProfiles();
      }
      refreshTimeoutRef.current = null;
    }, remainingTime);
  }, [fetchProfiles]);

  // Initial fetch on mount and user change
  useEffect(() => {
    let mounted = true;
    isMountedRef.current = true;

    const initializeProfiles = async () => {
      if (mounted && user) {
        await fetchProfiles();
      }
    };

    initializeProfiles();

    return () => {
      mounted = false;
      isMountedRef.current = false;
      
      // Clean up timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [user?.id]); // Only depend on user.id to avoid unnecessary re-runs

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      profiles,
      refreshProfiles,
      loading,
    }),
    [profiles, refreshProfiles, loading]
  );

  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};