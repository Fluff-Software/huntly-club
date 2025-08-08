import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { getProfiles, Profile } from "@/services/profileService";

type PlayerContextType = {
  currentPlayer: Profile | null;
  profiles: Profile[];
  setCurrentPlayer: (player: Profile | null) => void;
  refreshProfiles: () => Promise<void>;
  loading: boolean;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [currentPlayer, setCurrentPlayer] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);

  // Clear current player when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentPlayer(null);
      setProfiles([]);
    }
  }, [user]);

  const fetchProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setCurrentPlayer(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const profilesData = await getProfiles(user.id);
      setProfiles(profilesData);

      // Only update current player if we already have one and it still exists
      if (profilesData.length > 0) {
        setCurrentPlayer((prevCurrentPlayer) => {
          if (prevCurrentPlayer) {
            // Find the updated version of the current player
            const updatedCurrentPlayer = profilesData.find(
              (p) => p.id === prevCurrentPlayer.id
            );
            if (updatedCurrentPlayer) {
              // Only update if the data has actually changed (compare specific fields instead of JSON.stringify)
              if (
                updatedCurrentPlayer.name !== prevCurrentPlayer.name ||
                updatedCurrentPlayer.nickname !== prevCurrentPlayer.nickname ||
                updatedCurrentPlayer.colour !== prevCurrentPlayer.colour ||
                updatedCurrentPlayer.team !== prevCurrentPlayer.team ||
                updatedCurrentPlayer.xp !== prevCurrentPlayer.xp
              ) {
                return updatedCurrentPlayer;
              }
              return prevCurrentPlayer; // No change needed
            } else {
              // If current player no longer exists, don't auto-select another one
              return null;
            }
          } else {
            // Don't automatically set a current player - user must select one
            return null;
          }
        });
      } else {
        setCurrentPlayer(null);
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshProfiles = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshRef.current;

    // Debounce: don't refresh more than once every 2 seconds
    if (timeSinceLastRefresh < 2000) {
      // Clear existing timeout and set a new one
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        fetchProfiles();
        lastRefreshRef.current = Date.now();
      }, 2000 - timeSinceLastRefresh);

      return;
    }

    // If enough time has passed, refresh immediately
    await fetchProfiles();
    lastRefreshRef.current = now;
  }, [fetchProfiles]);

  useEffect(() => {
    let isMounted = true;

    const initProfiles = async () => {
      if (isMounted) {
        await fetchProfiles();
      }
    };

    initProfiles();

    return () => {
      isMounted = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [fetchProfiles]);

  return (
    <PlayerContext.Provider
      value={{
        currentPlayer,
        profiles,
        setCurrentPlayer,
        refreshProfiles,
        loading,
      }}
    >
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
