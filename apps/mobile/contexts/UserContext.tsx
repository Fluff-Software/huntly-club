import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  getTeamById,
  getUserData,
  Team,
} from "@/services/profileService";

type UserData = {
  user_id: string;
  team: number | null;
};

type UserContextType = {
  userData: UserData | null;
  team: Team | null;
  teamId: number | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadUserAndTeam = useCallback(
    async (userId: string | null) => {
      if (!userId) {
        setUserData(null);
        setTeam(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getUserData(userId);
        if (!data) {
          setUserData(null);
          setTeam(null);
          return;
        }
        setUserData(data);

        if (data.team != null) {
          const teamResult = await getTeamById(data.team);
          setTeam(teamResult);
        } else {
          setTeam(null);
        }
      } catch (err) {
        console.error("Error loading user/team data in UserContext:", err);
        setUserData(null);
        setTeam(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadUserAndTeam(user?.id ?? null);
  }, [user?.id, loadUserAndTeam]);

  const refreshUserData = useCallback(async () => {
    await loadUserAndTeam(user?.id ?? null);
  }, [loadUserAndTeam, user?.id]);

  const value = useMemo<UserContextType>(
    () => ({
      userData,
      team,
      teamId: userData?.team ?? team?.id ?? null,
      loading,
      refreshUserData,
    }),
    [userData, team, loading, refreshUserData]
  );

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

