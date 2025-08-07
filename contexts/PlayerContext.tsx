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

      // Set the first profile as current player if no player is selected
      if (profilesData.length > 0 && !currentPlayer) {
        setCurrentPlayer(profilesData[0]);
      } else if (profilesData.length === 0) {
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
