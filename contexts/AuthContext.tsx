import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { User, getCurrentUser, signIn, signOut, signUp, onAuthStateChange } from '@/services/authService';
import { updatePurchasesUserId, resetPurchasesUser } from '@/services/purchasesService';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        setUser(user);
        
        // If user exists, update RevenueCat user ID
        if (user?.id) {
          await updatePurchasesUserId(user.id);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    const { data: authListener } = onAuthStateChange((session) => {
      setSession(session);
      setLoading(false);
      
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email,
        };
        setUser(userData);
        
        // Update RevenueCat user ID
        updatePurchasesUserId(userData.id).catch(err => {
          console.error('Error updating RevenueCat user ID:', err);
        });
      } else {
        setUser(null);
        
        // Reset RevenueCat user
        resetPurchasesUser().catch(err => {
          console.error('Error resetting RevenueCat user:', err);
        });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { session } = await signIn(email, password);
      setSession(session);
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email,
        };
        setUser(userData);
        
        // Update RevenueCat user ID
        await updatePurchasesUserId(userData.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { session } = await signUp(email, password);
      setSession(session);
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email,
        };
        setUser(userData);
        
        // Update RevenueCat user ID
        await updatePurchasesUserId(userData.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      // Reset RevenueCat user before signing out
      await resetPurchasesUser();
      await signOut();
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 