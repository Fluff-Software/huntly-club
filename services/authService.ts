import { supabase } from './supabase';
import { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

/** Check if an email is already registered (via Edge Function). Returns true if available to use. */
export const checkEmailAvailable = async (email: string): Promise<{ available: boolean; error?: string }> => {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { available: false, error: 'Email is required.' };
  }
  try {
    const { data, error } = await supabase.functions.invoke<{ taken: boolean }>('check-email', {
      body: { email: trimmed },
    });
    if (error) {
      return { available: true, error: error.message };
    }
    const taken = data?.taken ?? false;
    return { available: !taken };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not check email.';
    return { available: true, error: message };
  }
};

export type User = {
  id: string;
  email: string | undefined;
};

export type Session = {
  user: User | null;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
};

export const signUp = async (email: string, password: string) => {
  // Get the URL prefix for the app
  const redirectUrl = Linking.createURL('auth/confirm');
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) {
    throw error;
  }

  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw error;
  }
};

export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
};

export const onAuthStateChange = (callback: (session: SupabaseSession | null) => void) => {
  return supabase.auth.onAuthStateChange((_, session) => {
    callback(session);
  });
}; 