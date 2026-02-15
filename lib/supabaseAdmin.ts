import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error('Missing required environment variable: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  }

  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  cached = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return cached;
}
