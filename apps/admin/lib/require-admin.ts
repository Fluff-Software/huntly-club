import { createServerAuthClient } from "@/lib/supabase-server-auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export type AdminSession = { userId: string; accessToken: string };

/**
 * Server-side admin check for server actions. The (main) layout only guards page
 * renders; server actions can be POSTed directly, so sensitive ones should call this.
 * Returns the admin's access token so it can be forwarded to edge functions that
 * verify the admin themselves.
 */
export async function requireAdmin(): Promise<AdminSession | { error: string }> {
  const auth = await createServerAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const {
    data: { session },
  } = await auth.auth.getSession();
  if (!session?.access_token) return { error: "Not signed in." };

  const supabase = createServerSupabaseClient();
  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) return { error: "Admins only." };

  return { userId: user.id, accessToken: session.access_token };
}
