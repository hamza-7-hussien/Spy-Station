import { createClient } from '@supabase/supabase-js';
import publicConfig from './supabase-config.json';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || publicConfig.url || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || publicConfig.anonKey || '').trim();

export const GOOGLE_OAUTH_CLIENT_ID = (
  import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
  publicConfig.googleClientId ||
  ''
).trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
});
