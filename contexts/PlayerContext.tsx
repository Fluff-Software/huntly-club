import React, { createContext, useContext, useState, useEffect } from "react";
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

  const fetchProfiles = async () => {
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

      // Only update current player if we don't have one or if the current one no longer exists
      if (profilesData.length > 0) {
        if (currentPlayer) {
          // Find the updated version of the current player
          const updatedCurrentPlayer = profilesData.find(
            (p) => p.id === currentPlayer.id
          );
          if (updatedCurrentPlayer) {
            // Only update if the data has actually changed
            if (
              JSON.stringify(updatedCurrentPlayer) !==
              JSON.stringify(currentPlayer)
            ) {
              setCurrentPlayer(updatedCurrentPlayer);
            }
          } else {
            // If current player no longer exists, set first profile
            setCurrentPlayer(profilesData[0]);
          }
        } else {
          // Set the first profile as current player if no player is selected
          setCurrentPlayer(profilesData[0]);
        }
      } else {
        setCurrentPlayer(null);
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfiles = async () => {
    await fetchProfiles();
  };

  useEffect(() => {
    fetchProfiles();
  }, [user]);

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
