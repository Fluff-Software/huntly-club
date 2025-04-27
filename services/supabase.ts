import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';        // fixes URL & crypto in RN

const { supabaseUrl, supabaseAnon } = process.env;

export const supabase = createClient(
  supabaseUrl!,
  supabaseAnon!,
  {
    auth: { persistSession: true, autoRefreshToken: true },
  }
);