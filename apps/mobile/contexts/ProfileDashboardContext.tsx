import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  getRecentCompletedActivities,
  type RecentCompletedActivity,
} from "@/services/activityProgressService";
import { getXpByProfileIds } from "@/services/teamActivityService";
import type { Profile } from "@/services/profileService";

export type RecentActivityWithProfile = RecentCompletedActivity & {
  profileName: string;
};

const RECENT_LIMIT_PER_PROFILE = 8;
const RECENT_DISPLAY_LIMIT = 5;

async function fetchProfileDashboardData(profiles: Profile[]): Promise<{
  recentActivities: RecentActivityWithProfile[];
  xpByProfileId: Record<number, number>;
}> {
  const ids = profiles.map((p) => p.id);
  if (ids.length === 0) {
    return { recentActivities: [], xpByProfileId: {} };
  }

  const [activityResults, xpByProfileId] = await Promise.all([
    Promise.all(
      profiles.map((p) =>
        getRecentCompletedActivities(p.id, RECENT_LIMIT_PER_PROFILE)
      )
    ),
    getXpByProfileIds(ids),
  ]);

  const withProfile: RecentActivityWithProfile[] = activityResults.flatMap(
    (activities, i) =>
      activities.map((a) => ({
        ...a,
        profileName: profiles[i].name,
      }))
  );

  const sorted = withProfile.sort(
    (a, b) =>
      new Date(b.completed_at ?? 0).getTime() -
      new Date(a.completed_at ?? 0).getTime()
  );

  return {
    recentActivities: sorted.slice(0, RECENT_DISPLAY_LIMIT),
    xpByProfileId,
  };
}

type ProfileDashboardContextValue = {
  recentActivities: RecentActivityWithProfile[];
  xpByProfileId: Record<number, number>;
  recentActivitiesLoading: boolean;
  preload: () => void;
  refresh: () => Promise<void>;
};

const ProfileDashboardContext =
  createContext<ProfileDashboardContextValue | null>(null);

export function ProfileDashboardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { profiles } = usePlayer();
  const [recentActivities, setRecentActivities] = useState<
    RecentActivityWithProfile[]
  >([]);
  const [xpByProfileId, setXpByProfileId] = useState<Record<number, number>>({});
  const [recentActivitiesLoading, setRecentActivitiesLoading] = useState(false);

  const profilesKey = useMemo(
    () => profiles.map((p) => p.id).join(","),
    [profiles]
  );
  const loadedKeyRef = useRef<string | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const pendingRefreshRef = useRef(false);

  const loadDashboard = useCallback(
    async (options?: { force?: boolean }) => {
      if (!user?.id || profiles.length === 0) {
        loadedKeyRef.current = null;
        setRecentActivities([]);
        setXpByProfileId({});
        setRecentActivitiesLoading(false);
        return;
      }

      const key = profilesKey;
      if (
        !options?.force &&
        loadedKeyRef.current === key &&
        !pendingRefreshRef.current
      ) {
        return;
      }

      if (inFlightRef.current) {
        pendingRefreshRef.current = true;
        await inFlightRef.current;
        return;
      }

      const run = async () => {
        do {
          pendingRefreshRef.current = false;
          setRecentActivitiesLoading(true);
          try {
            const data = await fetchProfileDashboardData(profiles);
            loadedKeyRef.current = key;
            setRecentActivities(data.recentActivities);
            setXpByProfileId(data.xpByProfileId);
          } catch {
            if (loadedKeyRef.current !== key) {
              setRecentActivities([]);
              setXpByProfileId({});
            }
          } finally {
            setRecentActivitiesLoading(false);
          }
        } while (pendingRefreshRef.current);
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
    },
    [user?.id, profiles, profilesKey]
  );

  const preload = useCallback(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const refresh = useCallback(async () => {
    pendingRefreshRef.current = true;
    await loadDashboard({ force: true });
  }, [loadDashboard]);

  useEffect(() => {
    if (!user?.id) {
      loadedKeyRef.current = null;
      setRecentActivities([]);
      setXpByProfileId({});
      setRecentActivitiesLoading(false);
      pendingRefreshRef.current = false;
      inFlightRef.current = null;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || profiles.length === 0) {
      loadedKeyRef.current = null;
      setRecentActivities([]);
      setXpByProfileId({});
      setRecentActivitiesLoading(false);
      return;
    }
    if (loadedKeyRef.current !== profilesKey) {
      void loadDashboard();
    }
  }, [user?.id, profiles.length, profilesKey, loadDashboard]);

  const value = useMemo(
    () => ({
      recentActivities,
      xpByProfileId,
      recentActivitiesLoading,
      preload,
      refresh,
    }),
    [
      recentActivities,
      xpByProfileId,
      recentActivitiesLoading,
      preload,
      refresh,
    ]
  );

  return (
    <ProfileDashboardContext.Provider value={value}>
      {children}
    </ProfileDashboardContext.Provider>
  );
}

export function useProfileDashboard() {
  const ctx = useContext(ProfileDashboardContext);
  if (!ctx) {
    throw new Error(
      "useProfileDashboard must be used within ProfileDashboardProvider"
    );
  }
  return ctx;
}
