/**
 * "New chapter available" push to every device with push enabled.
 *
 * Auth: admin-only. The caller must send the admin's own access token (aal2 and a row
 * in `public.admins`); see `_shared/requireAdminCaller.ts`.
 *
 * Body: { chapterId: number }
 * Response: { success, recipients, count, report } where count is the number of
 * notifications Expo accepted and report is the full delivery summary.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadEnabledPushTokens, sendExpoPush } from "../_shared/expoPush.ts";
import { requireAdminCaller } from "../_shared/requireAdminCaller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Payload = { chapterId?: unknown };

type ChapterRow = { id: number; title: string | null; season_id: number };
type SeasonRow = { name: string | null };

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

  // --- Input ---
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  const chapterId =
    typeof body.chapterId === "number" && Number.isInteger(body.chapterId) ? body.chapterId : null;
  if (chapterId == null) {
    return jsonResponse({ error: "chapterId is required and must be a number." }, 400);
  }

  try {
    const { data: chapter, error: chapterError } = await admin
      .from("chapters")
      .select("id, title, season_id")
      .eq("id", chapterId)
      .maybeSingle();
    if (chapterError || !chapter) {
      return jsonResponse({ error: "Chapter not found." }, 404);
    }

    const { data: season } = await admin
      .from("seasons")
      .select("name")
      .eq("id", (chapter as ChapterRow).season_id)
      .maybeSingle();

    const seasonName = (season as SeasonRow | null)?.name ?? null;
    const chapterTitle = (chapter as ChapterRow).title ?? "New chapter";
    const title = "New chapter available";
    const bodyText = seasonName
      ? `${chapterTitle} is now available in ${seasonName}.`
      : `${chapterTitle} is now available.`;

    const tokens = await loadEnabledPushTokens(admin);

    console.log(
      `send-chapter-push: admin ${caller.user.id} sending chapter ${chapterId} to ${tokens.length} devices`
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
        body: bodyText,
        sound: "default",
        priority: "high",
        data: { chapterId, screen: "story" },
      }),
      { logTag: "send-chapter-push" }
    );

    console.log("send-chapter-push: report", JSON.stringify(report));

    if (report.accepted === 0 && report.rejected > 0) {
      return jsonResponse(
        {
          success: false,
          recipients: tokens.length,
          count: 0,
          report,
          error: "Expo rejected every notification. Check the push credentials in Expo.",
        },
        502
      );
    }

    return jsonResponse({ success: true, recipients: tokens.length, count: report.accepted, report }, 200);
  } catch (e) {
    console.error("send-chapter-push error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
});
