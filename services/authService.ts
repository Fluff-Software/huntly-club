import { supabase } from './supabase';
import { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

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