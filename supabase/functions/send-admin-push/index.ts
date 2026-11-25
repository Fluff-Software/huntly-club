/**
 * Admin broadcast: send one push notification to every device with push enabled.
 *
 * Auth: the caller must send the admin's own Supabase access token
 * (`Authorization: Bearer <user JWT>`). The user must be in `public.admins` and the
 * session must be MFA-verified (aal2), matching the admin app's own login rules.
 * The anon key and other users' tokens are rejected, so the app's public key
 * can't be used to broadcast.
 *
 * Body: { title?: string, message: string, audience?: Audience, dryRun?: boolean }
 *  - audience (default everyone):
 *      { type: "all" }                         every device with push on
 *      { type: "users", userIds: string[] }    devices linked to these users
 *      { type: "inactive", days: number }      users not active in the app for N+ days
 *  - dryRun: true returns { recipients } without sending (used for the confirm step).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendExpoPush } from "../_shared/expoPush.ts";
import { requireAdminCaller } from "../_shared/requireAdminCaller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TITLE = "Huntly World";
const MAX_TITLE_LENGTH = 65;
const MAX_MESSAGE_LENGTH = 240;

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Payload = { title?: unknown; message?: unknown; audience?: unknown; dryRun?: unknown };

type Audience =
  | { type: "all" }
  | { type: "users"; userIds: string[] }
  | { type: "inactive"; days: number };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^Expo(nent)?PushToken\[.+\]$/;

function parseAudience(raw: unknown): Audience | { error: string } {
  if (raw == null) return { type: "all" };
  const a = raw as { type?: unknown; userIds?: unknown; days?: unknown };
  if (a.type === "all") return { type: "all" };
  if (a.type === "users") {
    const ids = Array.isArray(a.userIds) ? a.userIds.filter((id): id is string => typeof id === "string") : [];
    if (ids.length === 0) return { error: "Pick at least one user." };
    if (ids.length > 500 || !ids.every((id) => UUID_RE.test(id))) return { error: "Invalid user list." };
    return { type: "users", userIds: ids };
  }
  if (a.type === "inactive") {
    const days = typeof a.days === "number" ? Math.floor(a.days) : NaN;
    if (!Number.isFinite(days) || days < 1 || days > 3650) return { error: "Invalid number of days." };
    return { type: "inactive", days };
  }
  return { error: "Unknown audience." };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Admin-only access ---
  const caller = await requireAdminCaller(req, admin);
  if (!caller.ok) return jsonResponse({ error: caller.error }, caller.status);
  const user = caller.user;

  // --- Input ---
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : DEFAULT_TITLE;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const dryRun = body.dryRun === true;
  const audience = parseAudience(body.audience);
  if ("error" in audience) return jsonResponse({ error: audience.error }, 400);

  if (!dryRun && !message) return jsonResponse({ error: "Message is required." }, 400);
  if (title.length > MAX_TITLE_LENGTH) {
    return jsonResponse({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` }, 400);
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` }, 400);
  }

  try {
    const { data: rows, error: audienceError } = await admin.rpc("admin_push_audience", {
      p_audience: audience.type,
      p_inactive_days: audience.type === "inactive" ? audience.days : null,
      p_user_ids: audience.type === "users" ? audience.userIds : null,
    });
    if (audienceError) {
      console.error("send-admin-push: audience lookup failed", audienceError.message);
      return jsonResponse({ error: "Could not load the audience." }, 500);
    }
    const tokens = [
      ...new Set(
        ((rows ?? []) as { expo_push_token: string | null }[])
          .map((r) => r.expo_push_token?.trim() ?? "")
          .filter((t) => TOKEN_RE.test(t))
      ),
    ];

    if (dryRun) {
      return jsonResponse({ success: true, recipients: tokens.length }, 200);
    }

    console.log(
      `send-admin-push: admin ${user.id} sending to ${tokens.length} devices`,
      JSON.stringify({ audience: audience.type === "users" ? { type: "users", count: audience.userIds.length } : audience, title, messageLength: message.length })
    );

    if (tokens.length === 0) {
      return jsonResponse({ success: true, recipients: 0, count: 0 }, 200);
    }

    const report = await sendExpoPush(
      admin,
      tokens,
      (to) => ({
        to,
        title,
        body: message,
        sound: "default",
        priority: "high",
        data: { screen: "home", source: "admin" },
      }),
      { logTag: "send-admin-push" }
    );

    console.log("send-admin-push: report", JSON.stringify(report));

    return jsonResponse(
      {
        success: report.accepted > 0 || report.rejected === 0,
        recipients: tokens.length,
        count: report.accepted,
        report,
        ...(report.accepted === 0 && report.rejected > 0
          ? { error: "Expo rejected every notification. Check the push credentials in Expo." }
          : {}),
      },
      200
    );
  } catch (e) {
    console.error("send-admin-push error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
});
