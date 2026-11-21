import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const GOOGLE_OAUTH_CLIENT_ID = (import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'spy_station_sb_auth'
    },
    realtime: {
      params: {
        eventsPerSecond: 15
      }
    }
  }
);
