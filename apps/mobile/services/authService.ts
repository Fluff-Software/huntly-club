import { supabase } from './supabase';
import { User as SupabaseUser, Session as SupabaseSession, FunctionsHttpError } from '@supabase/supabase-js';

/** Get the real error message from an Edge Function invoke error (so we don't just show "non-2xx status code"). */
async function getInvokeErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError && error.context) {
    try {
      const body = await error.context.json();
      if (body && typeof (body as { error?: string }).error === 'string') {
        return (body as { error: string }).error;
      }
    } catch {
      // ignore
    }
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

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
      const message = await getInvokeErrorMessage(error);
      return { available: true, error: message };
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

export const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke<{ status?: string; error?: string }>(
    'signup-with-email',
    {
      body: { email: email.trim().toLowerCase(), password, metadata },
    }
  );

  if (error) {
    const message = await getInvokeErrorMessage(error);
    throw new Error(message);
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  // No session until user confirms email; return shape expected by AuthContext
  return { user: null, session: null };
};

/** Resend verification or recovery email via custom Mailjet-backed edge function. */
export const resendVerificationEmail = async (email: string, type: 'signup' | 'recovery' = 'signup') => {
  const { data, error } = await supabase.functions.invoke<{ status?: string; error?: string }>(
    'resend-auth-email',
    { body: { email: email.trim().toLowerCase(), type } }
  );

  if (error) {
    const message = await getInvokeErrorMessage(error);
    throw new Error(message);
  }
  if (data?.error) {
    throw new Error(data.error);
  }
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