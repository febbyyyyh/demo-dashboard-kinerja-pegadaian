import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)?.trim() ?? "";
const supabaseAnonKey =
  (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined)?.trim() ||
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined)?.trim() ||
  "";

/** True when Supabase project credentials are configured via Vite environment variables. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

/**
 * Lazy singleton Supabase client for browser auth (Google OAuth + Email OTP) and whitelist queries.
 * Returns null when env vars are not configured so local demo mode and unit tests work offline.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
