/**
 * Supabase auth helpers for the Explore local backend.
 * Never logs access tokens. Never trusts client-supplied user IDs.
 */
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type ExploreSupabaseEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey: string | null;
};

export function loadExploreSupabaseEnv(): ExploreSupabaseEnv | null {
  const url = process.env.EXPLORE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const anonKey =
    process.env.EXPLORE_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey =
    process.env.EXPLORE_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null;

  if (!url || !anonKey) return null;
  return { url, anonKey, serviceRoleKey };
}

export function createAnonClient(env: ExploreSupabaseEnv): SupabaseClient {
  return createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createServiceClient(env: ExploreSupabaseEnv): SupabaseClient | null {
  if (!env.serviceRoleKey) return null;
  return createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  return match?.[1]?.trim() || null;
}

export async function resolveUserFromAccessToken(
  env: ExploreSupabaseEnv,
  accessToken: string
): Promise<{ ok: true; user: User } | { ok: false; error: "unauthenticated" }> {
  const client = createAnonClient(env);
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) {
    return { ok: false, error: "unauthenticated" };
  }
  return { ok: true, user: data.user };
}
