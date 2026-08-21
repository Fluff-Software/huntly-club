import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore Supabase Edge runtime supports npm specifiers.
import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-ignore Deno-style relative imports are resolved by Edge runtime.
import { sendEmail } from "../_shared/mailjet.ts";
// @ts-ignore Deno-style relative imports are resolved by Edge runtime.
import { wrapEmailBody } from "../_shared/emailTemplate.ts";
// @ts-ignore Deno-style relative imports are resolved by Edge runtime.
import { reminderUnlockDateForSend } from "../_shared/chapterNotificationSchedule.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type DenoLike = {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};
const deno = (globalThis as typeof globalThis & { Deno: DenoLike }).Deno;

function jsonResponse(body: object, status: number, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...headers },
  });
}

type MissionRow = { id: number; title: string; reminder_message: string | null };
type UserDataRow = { user_id: string };
type ProfileRow = { id: number; user_id: string };

async function parseBody(req: Request): Promise<{ dryRun: boolean }> {
  try {
    const body = (await req.json()) as { dryRun?: unknown };
    return { dryRun: body?.dryRun === true };
  } catch {
    return { dryRun: false };
  }
}

deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { dryRun } = await parseBody(req);

    const supabaseUrl = deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const targetDate = reminderUnlockDateForSend();
    if (!targetDate) {
      return jsonResponse(
        { success: true, count: 0, skipped: true, reason: "before_8am_uk" },
        200
      );
    }

    // Missions (activities) released yesterday, regardless of chapter/campfire linkage.
    const { data: missionRows, error: missionsError } = await admin
      .from("activities")
      .select("id, title, reminder_message")
      .eq("content_status", "published")
      .eq("release_date", targetDate)
      .order("id", { ascending: true });

    if (missionsError) {
      console.error("send-weekly-chapter-reminder: error loading missions", missionsError.message);
      return jsonResponse({ error: "Failed to load missions." }, 500);
    }

    const missions: MissionRow[] = (missionRows ?? [])
      .map((a: any) => ({
        id: Number(a.id),
        title: String(a.title ?? ""),
        reminder_message: a.reminder_message != null ? String(a.reminder_message) : null,
      }))
      .filter((a: MissionRow) => a.title.trim() !== "");

    if (missions.length === 0) {
      return jsonResponse(
        { success: true, count: 0, skipped: true, reason: "no_missions_released_yesterday" },
        200
      );
    }

    // Idempotency: only send once per calendar day (skipped for dry runs so they can be re-tested).
    if (!dryRun) {
      const { data: existing } = await admin
        .from("mission_notification_send_log")
        .select("id")
        .eq("notify_date", targetDate)
        .eq("kind", "reminder")
        .maybeSingle();
      if (existing) {
        return jsonResponse({ success: true, count: 0, skipped: true }, 200);
      }
    }

    const missionIds = missions.map((m) => m.id);

    // Households that finished at least one of yesterday's missions are exempt from the nudge.
    const { data: progressRows, error: progressError } = await admin
      .from("user_activity_progress")
      .select("profile_id")
      .in("activity_id", missionIds)
      .not("completed_at", "is", null);

    if (progressError) {
      console.error("send-weekly-chapter-reminder: error loading progress", progressError.message);
      return jsonResponse({ error: "Failed to load mission progress." }, 500);
    }

    const completedProfileIds = [
      ...new Set((progressRows ?? []).map((r: { profile_id: number }) => r.profile_id)),
    ];

    const completedUserIds = new Set<string>();
    if (completedProfileIds.length > 0) {
      const { data: profileRows, error: profilesError } = await admin
        .from("profiles")
        .select("id, user_id")
        .in("id", completedProfileIds);

      if (profilesError) {
        console.error("send-weekly-chapter-reminder: error loading profiles", profilesError.message);
        return jsonResponse({ error: "Failed to load profiles." }, 500);
      }

      for (const row of (profileRows ?? []) as ProfileRow[]) {
        if (row.user_id) completedUserIds.add(row.user_id);
      }
    }

    const subject =
      missions.length === 1
        ? "Don’t miss this week’s Huntly World mission"
        : "Don’t miss this week’s Huntly World missions";
    const intro = `
      <p style="margin: 0 0 16px; color: #36454F;">Hi there,</p>
      <p style="margin: 0 0 16px; color: #36454F;">
        Just a quick reminder: ${
          missions.length === 1
            ? "there’s a mission waiting for you in Huntly World."
            : "there are new missions waiting for you in Huntly World."
        }
      </p>
      <p style="margin: 0 0 16px; color: #36454F;">Here’s what’s waiting:</p>
    `;

    const listItems = `
      <ul style="margin: 0 0 16px; padding-left: 18px; color: #36454F;">
        ${missions
          .map((m) => {
            const msg = (m.reminder_message ?? "").trim();
            const safeMsg = msg ? msg.replace(/\n/g, "<br/>") : "Open the app for details.";
            return `<li style="margin: 0 0 10px;"><strong>${m.title}</strong><br/>${safeMsg}</li>`;
          })
          .join("")}
      </ul>
    `;

    const htmlPart = wrapEmailBody(intro + listItems);
    const textPartLines: string[] = [];
    textPartLines.push("Hi there,", "");
    textPartLines.push(
      missions.length === 1
        ? "Just a quick reminder: there’s a mission waiting for you in Huntly World."
        : "Just a quick reminder: there are new missions waiting for you in Huntly World."
    );
    textPartLines.push("", "What’s waiting:");
    for (const m of missions) {
      const msg = (m.reminder_message ?? "").trim();
      textPartLines.push(`- ${m.title}${msg ? `: ${msg}` : ""}`);
    }
    textPartLines.push("", "— The Huntly World team");
    const textPart = textPartLines.join("\n");

    const { data: users, error: usersError } = await admin
      .from("user_data")
      .select("user_id")
      .eq("weekly_email", true);

    if (usersError) {
      console.error("send-weekly-chapter-reminder: error loading recipients", usersError.message);
      return jsonResponse({ error: "Could not load recipients." }, 500);
    }

    const recipients = ((users ?? []) as UserDataRow[]).filter(
      (row) => row.user_id && !completedUserIds.has(row.user_id)
    );

    if (dryRun) {
      return jsonResponse(
        {
          success: true,
          dryRun: true,
          targetDate,
          missions: missions.map((m) => ({ id: m.id, title: m.title })),
          totalWeeklyEmailUsers: (users ?? []).length,
          eligibleRecipientCount: recipients.length,
          subject,
        },
        200
      );
    }

    const replyTo = deno.env.get("MAILJET_REPLY_TO");
    let emailSent = 0;
    for (const row of recipients) {
      const userId = row.user_id;
      const { data: userResult, error: userError } = await admin.auth.admin.getUserById(userId);
      const to = userResult?.user?.email?.trim().toLowerCase() ?? "";
      if (userError || !to) continue;
      try {
        const result = await sendEmail({
          to,
          subject,
          htmlPart,
          textPart,
          ...(replyTo && { replyTo }),
        });
        if (result.sent) emailSent += 1;
      } catch (e) {
        console.error("send-weekly-chapter-reminder: failed for user", userId, e);
      }
    }

    // Push is intentionally skipped here: push_tokens is device-keyed, not account-keyed, so
    // there's no way to target only households that haven't finished a mission yet — an
    // untargeted broadcast would nudge people who already completed it too.

    await admin.from("mission_notification_send_log").insert({
      notify_date: targetDate,
      kind: "reminder",
    });

    return jsonResponse({ success: true, emailCount: emailSent }, 200);
  } catch (e) {
    console.error("send-weekly-chapter-reminder error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
});
