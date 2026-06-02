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
  const userId = user?.id ?? null;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const pendingRefreshRef = useRef(false);
  const profilesCountRef = useRef(0);

  useEffect(() => {
    profilesCountRef.current = profiles.length;
  }, [profiles.length]);

  const fetchProfiles = useCallback(async (): Promise<void> => {
    if (!userId || !isMountedRef.current) {
      return;
    }

    if (inFlightRef.current) {
      pendingRefreshRef.current = true;
      await inFlightRef.current;
      return;
    }

    const run = async (): Promise<void> => {
      do {
        pendingRefreshRef.current = false;

        try {
          if (profilesCountRef.current === 0) {
            setLoading(true);
          }
          const profilesData = await getProfiles(userId);
          if (isMountedRef.current) {
            setProfiles(profilesData);
          }
        } catch (error) {
          if (isMountedRef.current) {
            console.error("Error fetching profiles:", error);
          }
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      } while (pendingRefreshRef.current && isMountedRef.current);
    };

    const promise = run();
    inFlightRef.current = promise;
    try {
      await promise;
    } finally {
      if (inFlightRef.current === promise) {
        inFlightRef.current = null;
      }
    }
  }, [userId]);

  const refreshProfiles = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    pendingRefreshRef.current = true;
    await fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!userId) {
      setProfiles([]);
      setLoading(false);
      pendingRefreshRef.current = false;
      inFlightRef.current = null;
      return () => {
        isMountedRef.current = false;
      };
    }

    void fetchProfiles();

    return () => {
      isMountedRef.current = false;
      pendingRefreshRef.current = false;
    };
  }, [userId, fetchProfiles]);

  const contextValue = useMemo(
    () => ({
      profiles,
      refreshProfiles,
      loading,
    }),
    [profiles, refreshProfiles, loading],
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
