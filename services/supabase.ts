import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';        // fixes URL & crypto in RN
import Constants from 'expo-constants';

// Get the environment variables from Expo Constants
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnon = Constants.expoConfig?.extra?.supabaseAnon;

if (!supabaseUrl || !supabaseAnon) {
  console.error('Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(
  supabaseUrl!,
  supabaseAnon!,
  {
    auth: { persistSession: true, autoRefreshToken: true },
  }
);