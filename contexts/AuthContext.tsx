import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getCurrentUser,
  signIn,
  signUp,
  signOut,
  onAuthStateChange,
} from "@/services/authService";
import {
  updatePurchasesUserId,
  resetPurchasesUser,
} from "@/services/purchasesService";
import { User, Session } from "@supabase/supabase-js";
import { getPendingProfiles, clearPendingProfiles } from "@/services/pendingProfileService";
import { getTeams, createProfile } from "@/services/profileService";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const createPendingProfilesIfNeeded = useCallback(async (userId: string, userEmail: string | undefined) => {
    try {
      const pendingData = await getPendingProfiles();
      if (!pendingData) return;
      
      // Check if this is the user who created these pending profiles
      if (!userEmail || pendingData.email.toLowerCase() !== userEmail.toLowerCase()) {
        // Clear stale pending data from a different user or missing email
        await clearPendingProfiles();
        return;
      }
      
      console.log('Creating pending profiles for user after email verification');
      
      // Get teams and create profiles
      const teams = await getTeams();
      const team = teams.find((t) => t.name.toLowerCase() === pendingData.selectedTeamName.toLowerCase());
      const teamId = team?.id ?? teams[0]?.id;
      
      if (teamId) {
        for (const player of pendingData.players) {
          await createProfile({
            user_id: userId,
            name: player.name,
            colour: player.colour,
            team: teamId,
            nickname: player.nickname,
          });
        }
        
        console.log(`Successfully created ${pendingData.players.length} profiles`);
        
        // Clear the pending data after successful creation
        await clearPendingProfiles();
      }
    } catch (error) {
      console.error("Error creating pending profiles:", error);
      // Don't throw - we don't want to break the auth flow
    }
  }, []);

  const updateUser = useCallback(async (userData: User | null) => {
    setUser(userData);
    if (userData?.id) {
      try {
        await updatePurchasesUserId(userData.id);
        // Check for pending profiles after user is authenticated
        await createPendingProfilesIfNeeded(userData.id, userData.email);
      } catch (err) {
        console.error("Error updating RevenueCat user ID:", err);
      }
    } else {
      try {
        await resetPurchasesUser();
      } catch (err) {
        console.error("Error resetting RevenueCat user:", err);
      }
    }
  }, [createPendingProfilesIfNeeded]);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        if (isMounted) {
          await updateUser(user);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    const { data: authListener } = onAuthStateChange((session) => {
      if (isMounted) {
        setSession(session);
        setLoading(false);

        if (session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email,
          };
          updateUser(userData);
        } else {
          updateUser(null);
        }
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [updateUser]);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const { session } = await signIn(email, password);
        setSession(session);
        if (session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email,
          };
          await updateUser(userData);
        }
      } finally {
        setLoading(false);
      }
    },
    [updateUser]
  );

  const handleSignUp = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const { session } = await signUp(email, password);
        setSession(session);
        if (session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email,
          };
          await updateUser(userData);
        }
      } finally {
        setLoading(false);
      }
    },
    [updateUser]
  );

  const handleSignOut = useCallback(async () => {
    setLoading(true);
    try {
      await resetPurchasesUser();
      await signOut();
      setSession(null);
      await updateUser(null);
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
