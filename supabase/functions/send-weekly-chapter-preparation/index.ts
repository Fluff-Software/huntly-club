import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore Supabase Edge runtime supports npm specifiers.
import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-ignore Deno-style relative imports are resolved by Edge runtime.
import { sendEmail } from "../_shared/mailjet.ts";
// @ts-ignore Deno-style relative imports are resolved by Edge runtime.
import { wrapEmailBody } from "../_shared/emailTemplate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;
const UK_TIME_ZONE = "Europe/London";

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

function ukDateForUnlockGate(now: Date = new Date()): string {
  // Chapters unlock at 6am UK time. Before that, treat as "yesterday".
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  const year = parseInt(get("year"), 10);
  const month = parseInt(get("month"), 10);
  const day = parseInt(get("day"), 10);
  const hour = parseInt(get("hour"), 10);

  // Use UTC math just to roll calendar date safely.
  const base = Date.UTC(year, month - 1, day, 12, 0, 0);
  const effective = hour < 6 ? base - 86_400_000 : base;
  const d = new Date(effective);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

type ChapterRow = { id: number; title: string | null; season_id: number; week_number: number | null };
type SeasonRow = { id: number; name: string | null };
type ActivityRow = { title: string; preparation_message: string | null };
type UserDataRow = { user_id: string };

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
    const supabaseUrl = deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const today = ukDateForUnlockGate();

    // Latest season.
    const { data: latestSeason, error: seasonError } = await admin
      .from("seasons")
      .select("id, name")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (seasonError || !latestSeason) {
      return jsonResponse({ error: "Failed to load season." }, 500);
    }

    // Latest unlocked chapter.
    const { data: chapter, error: chapterError } = await admin
      .from("chapters")
      .select("id, title, season_id, week_number")
      .eq("season_id", (latestSeason as SeasonRow).id)
      .lte("unlock_date", today)
      .order("unlock_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (chapterError || !chapter) {
      return jsonResponse({ success: true, count: 0 }, 200);
    }

    // Idempotency: only send once per chapter.
    const { data: existing } = await admin
      .from("chapter_notification_send_log")
      .select("id")
      .eq("chapter_id", (chapter as ChapterRow).id)
      .eq("kind", "preparation")
      .maybeSingle();
    if (existing) {
      return jsonResponse({ success: true, count: 0, skipped: true }, 200);
    }

    // Load missions + preparation message.
    const { data: caRows, error: caError } = await admin
      .from("chapter_activities")
      .select("order, activities(title, preparation_message)")
      .eq("chapter_id", (chapter as ChapterRow).id)
      .order("order", { ascending: true });

    if (caError) {
      console.error("send-weekly-chapter-preparation: error loading chapter activities", caError.message);
      return jsonResponse({ error: "Failed to load chapter activities." }, 500);
    }

    const missions: ActivityRow[] = (caRows ?? [])
      .map((r: any) => (Array.isArray(r.activities) ? r.activities[0] : r.activities))
      .filter(Boolean)
      .map((a: any) => ({
        title: String(a.title ?? ""),
        preparation_message: a.preparation_message != null ? String(a.preparation_message) : null,
      }))
      .filter((a: ActivityRow) => a.title.trim() !== "");

    const seasonName = (latestSeason as SeasonRow).name ?? null;
    const chapterTitle = (chapter as ChapterRow).title ?? "New chapter";
    const weekNumber = (chapter as ChapterRow).week_number;
    const chapterLabel =
      typeof weekNumber === "number" ? `Week ${weekNumber}: ${chapterTitle}` : chapterTitle;

    // Email.
    const subject = "Your new Huntly World chapter is ready";
    const intro = `
      <p style="margin: 0 0 16px; color: #36454F;">Hi there,</p>
      <p style="margin: 0 0 16px; color: #36454F;">
        A new chapter is now available in Huntly World${seasonName ? ` for <strong>${seasonName}</strong>` : ""}.
      </p>
      <p style="margin: 0 0 16px; color: #36454F;"><strong>${chapterLabel}</strong></p>
      <p style="margin: 0 0 16px; color: #36454F;">
        Here are a few mission prep notes to help you get ready:
      </p>
    `;

    const listItems =
      missions.length === 0
        ? `<p style="margin: 0; color: #36454F;">Open the app to see this week’s missions.</p>`
        : `
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
      `A new chapter is now available in Huntly World${seasonName ? ` for ${seasonName}` : ""}.`
    );
    textPartLines.push("", chapterLabel, "");
    textPartLines.push("Mission prep notes:");
    if (missions.length === 0) {
      textPartLines.push("- Open the app to see this week’s missions.");
    } else {
      for (const m of missions) {
        const msg = (m.preparation_message ?? "").trim();
        textPartLines.push(`- ${m.title}${msg ? `: ${msg}` : ""}`);
      }
    }
    textPartLines.push("", "— The Huntly World team");
    const textPart = textPartLines.join("\n");

    const { data: users, error: usersError } = await admin
      .from("user_data")
      .select("user_id")
      .eq("weekly_email", true);

    if (usersError) {
      console.error("send-weekly-chapter-preparation: error loading recipients", usersError.message);
      return jsonResponse({ error: "Could not load recipients." }, 500);
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
        await sendEmail({
          to,
          subject,
          htmlPart,
          textPart,
          ...(replyTo && { replyTo }),
        });
        emailSent += 1;
      } catch (e) {
        console.error("send-weekly-chapter-preparation: failed for user", userId, e);
      }
    }

    // Push (generic "new chapter available").
    const pushTitle = "New chapter available";
    const pushBody = seasonName
      ? `${chapterTitle} is now available in ${seasonName}.`
      : `${chapterTitle} is now available.`;
    const pushSent = await sendPushToAllEnabledDevices(admin, {
      title: pushTitle,
      body: pushBody,
      data: { chapterId: (chapter as ChapterRow).id, screen: "story" },
    });

    // Record send (after success paths). Even if some recipients fail, we still record to avoid spamming.
    await admin.from("chapter_notification_send_log").insert({
      chapter_id: (chapter as ChapterRow).id,
      kind: "preparation",
    });

    return jsonResponse({ success: true, emailCount: emailSent, pushCount: pushSent }, 200);
  } catch (e) {
    console.error("send-weekly-chapter-preparation error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
});

