/**
 * Auth helpers for Explore Edge Functions.
 * Never trusts client-supplied user IDs. Never logs tokens.
 */
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

export type ExploreEnv = {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
};

export function loadExploreEnv(): ExploreEnv | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim() ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return null;
  return { supabaseUrl, anonKey, serviceRoleKey };
}

export function createAnonClient(env: ExploreEnv, accessToken?: string): SupabaseClient {
  return createClient(env.supabaseUrl, env.anonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createServiceClient(env: ExploreEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export async function requireAuthenticatedUser(
  env: ExploreEnv,
  req: Request
): Promise<{ ok: true; user: User; accessToken: string } | { ok: false; status: number; error: string }> {
  const accessToken = extractBearerToken(req);
  if (!accessToken) {
    return { ok: false, status: 401, error: "unauthenticated" };
  }
  const client = createAnonClient(env);
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) {
    return { ok: false, status: 401, error: "unauthenticated" };
  }
  return { ok: true, user: data.user, accessToken };
}
