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

  const updateUser = useCallback(async (userData: User | null) => {
    setUser(userData);
    if (userData?.id) {
      try {
        await updatePurchasesUserId(userData.id);
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
  }, []);

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
