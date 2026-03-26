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
  getProfiles,
  getUserData,
  updateUserDataWeeklyEmail,
  Team,
} from "@/services/profileService";
import { getTotalXpForProfileIds } from "@/services/teamActivityService";

type UserData = {
  user_id: string;
  team: number | null;
  weekly_email: boolean;
};

type UserContextType = {
  userData: UserData | null;
  team: Team | null;
  teamId: number | null;
  loading: boolean;
  /** Days since auth user account was created (matches parents summary). */
  daysPlayed: number;
  /** Total XP across all of the user's profiles (matches parents summary). */
  pointsEarned: number;
  refreshUserData: () => Promise<void>;
  /** Update weekly email preference and refresh user data. */
  updateWeeklyEmail: (enabled: boolean) => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pointsEarned, setPointsEarned] = useState<number>(0);

  const daysPlayed =
    user?.created_at != null
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(user.created_at).getTime()) /
              (24 * 60 * 60 * 1000)
          )
        )
      : 0;

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

  const loadPointsEarned = useCallback(async (userId: string) => {
    try {
      const profiles = await getProfiles(userId);
      const profileIds = profiles.map((p) => p.id);
      const total = await getTotalXpForProfileIds(profileIds);
      setPointsEarned(total);
    } catch {
      setPointsEarned(0);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setPointsEarned(0);
      return;
    }
    void loadPointsEarned(user.id);
  }, [user?.id, loadPointsEarned]);

  const refreshUserData = useCallback(async () => {
    await loadUserAndTeam(user?.id ?? null);
    if (user?.id) void loadPointsEarned(user.id);
  }, [loadUserAndTeam, user?.id, loadPointsEarned]);

  const updateWeeklyEmail = useCallback(
    async (enabled: boolean) => {
      if (!user?.id) return;
      await updateUserDataWeeklyEmail(user.id, enabled);
      await refreshUserData();
    },
    [user?.id, refreshUserData]
  );

  const value = useMemo<UserContextType>(
    () => ({
      userData,
      team,
      teamId: userData?.team ?? team?.id ?? null,
      loading,
      daysPlayed,
      pointsEarned,
      refreshUserData,
      updateWeeklyEmail,
    }),
    [userData, team, loading, daysPlayed, pointsEarned, refreshUserData, updateWeeklyEmail]
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

