import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore Supabase Edge runtime supports npm specifiers.
import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-ignore Deno-style relative imports are resolved by Edge runtime.
import { sendEmail } from "../_shared/mailjet.ts";
// @ts-ignore Deno-style relative imports are resolved by Edge runtime.
import { wrapEmailBody } from "../_shared/emailTemplate.ts";
// @ts-ignore Deno-style relative imports are resolved by Edge runtime.
import { preparationUnlockDateForSend } from "../_shared/chapterNotificationSchedule.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;
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

type MissionRow = { id: number; title: string; preparation_message: string | null };
type UserDataRow = { user_id: string };

async function parseBody(req: Request): Promise<{ dryRun: boolean; testEmail: string | null }> {
  try {
    const body = (await req.json()) as { dryRun?: unknown; testEmail?: unknown };
    const testEmail =
      typeof body?.testEmail === "string" && body.testEmail.trim() !== ""
        ? body.testEmail.trim().toLowerCase()
        : null;
    return { dryRun: body?.dryRun === true, testEmail };
  } catch {
    return { dryRun: false, testEmail: null };
  }
}

async function sendPushToAllEnabledDevices(
  admin: ReturnType<typeof createClient>,
  payload: { title: string; body: string; data: Record<string, unknown> }
): Promise<number> {
  const { data: tokens, error: tokensError } = await admin
    .from("push_tokens")
    .select("expo_push_token")
    .eq("enabled", true);

  if (tokensError) {
    console.error("send-weekly-chapter-preparation: error loading tokens", tokensError.message);
    throw new Error("Could not load push tokens.");
  }

  const tokenList = (tokens ?? [])
    .map((r: { expo_push_token: string }) => r.expo_push_token)
    .filter(Boolean);
  if (tokenList.length === 0) return 0;

  const messages = tokenList.map((to: string) => ({
    to,
    sound: "default" as const,
    title: payload.title,
    body: payload.body,
    data: payload.data,
  }));

  let sent = 0;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("send-weekly-chapter-preparation: Expo API error", res.status, text);
      throw new Error("Failed to send push notifications.");
    }

    const result = (await res.json()) as { data?: { status?: string }[] };
    const receipts = Array.isArray(result?.data) ? result.data : [];
    sent += receipts.filter((r) => r?.status === "ok").length;
  }

  return sent;
}

deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { dryRun, testEmail } = await parseBody(req);

    const supabaseUrl = deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const targetDate = preparationUnlockDateForSend();
    if (!targetDate) {
      return jsonResponse(
        { success: true, count: 0, skipped: true, reason: "before_8am_uk" },
        200
      );
    }

    // Missions (activities) releasing today, regardless of chapter/campfire linkage.
    const { data: missionRows, error: missionsError } = await admin
      .from("activities")
      .select("id, title, preparation_message")
      .eq("content_status", "published")
      .eq("release_date", targetDate)
      .order("id", { ascending: true });

    if (missionsError) {
      console.error("send-weekly-chapter-preparation: error loading missions", missionsError.message);
      return jsonResponse({ error: "Failed to load missions." }, 500);
    }

    const missions: MissionRow[] = (missionRows ?? [])
      .map((a: any) => ({
        id: Number(a.id),
        title: String(a.title ?? ""),
        preparation_message: a.preparation_message != null ? String(a.preparation_message) : null,
      }))
      .filter((a: MissionRow) => a.title.trim() !== "");

    if (missions.length === 0) {
      return jsonResponse(
        { success: true, count: 0, skipped: true, reason: "no_missions_released_today" },
        200
      );
    }

    // Idempotency: only send once per calendar day (skipped for dry runs/test sends so they can be re-tested).
    if (!dryRun && !testEmail) {
      const { data: existing } = await admin
        .from("mission_notification_send_log")
        .select("id")
        .eq("notify_date", targetDate)
        .eq("kind", "preparation")
        .maybeSingle();
      if (existing) {
        return jsonResponse({ success: true, count: 0, skipped: true }, 200);
      }
    }

    const subject =
      missions.length === 1
        ? "A new Huntly World mission is ready"
        : "New Huntly World missions are ready";
    const intro = `
      <p style="margin: 0 0 16px; color: #36454F;">Hi there,</p>
      <p style="margin: 0 0 16px; color: #36454F;">
        ${
          missions.length === 1
            ? "A new mission is now available in Huntly World."
            : "New missions are now available in Huntly World."
        }
      </p>
      <p style="margin: 0 0 16px; color: #36454F;">
        Here are a few mission prep notes to help you get ready:
      </p>
    `;

    const listItems = `
      <ul style="margin: 0 0 16px; padding-left: 18px; color: #36454F;">
        ${missions
          .map((m) => {
            const msg = (m.preparation_message ?? "").trim();
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
        ? "A new mission is now available in Huntly World."
        : "New missions are now available in Huntly World."
    );
    textPartLines.push("", "Mission prep notes:");
    for (const m of missions) {
      const msg = (m.preparation_message ?? "").trim();
      textPartLines.push(`- ${m.title}${msg ? `: ${msg}` : ""}`);
    }
    textPartLines.push("", "— The Huntly World team");
    const textPart = textPartLines.join("\n");

    // Test send: one address only, bypasses recipients/push/send-log entirely.
    if (testEmail) {
      const replyToTest = deno.env.get("MAILJET_REPLY_TO");
      const result = await sendEmail({
        to: testEmail,
        subject,
        htmlPart,
        textPart,
        ...(replyToTest && { replyTo: replyToTest }),
      });
      return jsonResponse(
        { success: true, testEmail: true, sentTo: testEmail, sent: result.sent },
        200
      );
    }

    const { data: users, error: usersError } = await admin
      .from("user_data")
      .select("user_id")
      .eq("weekly_email", true);

    if (usersError) {
      console.error("send-weekly-chapter-preparation: error loading recipients", usersError.message);
      return jsonResponse({ error: "Could not load recipients." }, 500);
    }

    if (dryRun) {
      return jsonResponse(
        {
          success: true,
          dryRun: true,
          targetDate,
          missions: missions.map((m) => ({ id: m.id, title: m.title })),
          recipientCount: (users ?? []).length,
          subject,
        },
        200
      );
    }

    const replyTo = deno.env.get("MAILJET_REPLY_TO");
    let emailSent = 0;
    for (const row of (users ?? []) as UserDataRow[]) {
      const userId = row.user_id;
      if (!userId) continue;
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
        console.error("send-weekly-chapter-preparation: failed for user", userId, e);
      }
    }

    // Push (generic "new mission(s) available").
    const pushTitle = missions.length === 1 ? "New mission available" : "New missions available";
    const pushBody =
      missions.length === 1
        ? `${missions[0].title} is now available.`
        : `${missions.length} new missions are now available in Huntly World.`;
    const pushSent = await sendPushToAllEnabledDevices(admin, {
      title: pushTitle,
      body: pushBody,
      data: { activityIds: missions.map((m) => m.id), screen: "story" },
    });

    // Record send (after success paths). Even if some recipients fail, we still record to avoid spamming.
    await admin.from("mission_notification_send_log").insert({
      notify_date: targetDate,
      kind: "preparation",
    });

    return jsonResponse({ success: true, emailCount: emailSent, pushCount: pushSent }, 200);
  } catch (e) {
    console.error("send-weekly-chapter-preparation error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
});
