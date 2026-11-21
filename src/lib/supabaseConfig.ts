/**
 * Optional Supabase environment configuration scaffold.
 * Activated cleanly via VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 */
export interface SupabaseEnvConfig {
  url: string;
  anonKey: string;
  configured: boolean;
}

export function getSupabaseConfig(): SupabaseEnvConfig {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey)
  };
}
