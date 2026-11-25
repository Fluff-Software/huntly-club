/**
 * Admin-only access for edge functions deployed with `verify_jwt = false`.
 *
 * The caller must send the admin's own Supabase access token
 * (`Authorization: Bearer <user JWT>`). The user must be in `public.admins` and the
 * session must be MFA-verified (aal2), matching the admin app's own login rules.
 * The anon key, the service role key and other users' tokens are rejected.
 */
import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2";

export type AdminCallerResult =
  | { ok: true; user: User }
  | { ok: false; status: 401 | 403; error: string };

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const part = jwt.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/** `admin` must be a service-role client. */
export async function requireAdminCaller(
  req: Request,
  admin: SupabaseClient
): Promise<AdminCallerResult> {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return { ok: false, status: 401, error: "Not signed in." };

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (userError || !user) return { ok: false, status: 401, error: "Not signed in." };

  // getUser has verified the token, so its claims can be trusted.
  const claims = decodeJwtPayload(jwt);
  if (claims?.aal !== "aal2") {
    return { ok: false, status: 403, error: "Two-factor verification is required." };
  }

  const { data: adminRow, error: adminError } = await admin
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (adminError || !adminRow) return { ok: false, status: 403, error: "Admins only." };

  return { ok: true, user };
}
